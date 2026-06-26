
import { inngest } from "../client";
import { db } from "@/lib/db";
import { leaveRequests, users, leaveTypes, organizations, organizationMembers } from "@/lib/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { subHours, format } from "date-fns";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";

export const leaveEscalation = inngest.createFunction(
  {
    id: "leave-escalation",
    name: "Auto-Escalate Stale Leave Requests (48h)",
    triggers: { cron: "0 */6 * * *" },
  },
  async () => {
    const cutoff = subHours(new Date(), 48);

    const staleRequests = await db
      .select({
        id: leaveRequests.id,
        orgId: leaveRequests.orgId,
        userId: leaveRequests.userId,
        leaveTypeId: leaveRequests.leaveTypeId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, "PENDING"),
          lt(leaveRequests.createdAt, cutoff)
        )
      )
      .limit(200);

    if (staleRequests.length === 0) return { escalated: 0 };

    const byOrg = new Map<string, typeof staleRequests>();
    for (const req of staleRequests) {
      const list = byOrg.get(req.orgId) ?? [];
      list.push(req);
      byOrg.set(req.orgId, list);
    }

    let escalated = 0;

    for (const [orgId, requests] of byOrg) {
      const escalationMember = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          firstName: users.firstName,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            inArray(organizationMembers.role, ["HR", "HR_MANAGER", "CEO", "ADMIN"]),
            eq(users.isActive, true)
          )
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);
      const escalationTarget = escalationMember;

      if (!escalationTarget?.email) continue;

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { name: true },
      });

      const rows = await Promise.all(
        requests.map(async (r) => {
          const employee = await db.query.users.findFirst({
            where: eq(users.id, r.userId),
            columns: { name: true, firstName: true, email: true },
          });
          const leaveType = r.leaveTypeId
            ? await db.query.leaveTypes.findFirst({
                where: eq(leaveTypes.id, r.leaveTypeId),
                columns: { name: true },
              })
            : null;
          const empName = employee?.name ?? employee?.firstName ?? employee?.email ?? r.userId;
          const leaveName = leaveType?.name ?? "Leave";
          const since = r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—";
          return `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${empName}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${leaveName}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${r.startDate} → ${r.endDate}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${since}</td>
          </tr>`;
        })
      );

      const escalateeName =
        escalationTarget.name ?? escalationTarget.firstName ?? "HR Manager";

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
          <h2 style="color:#0f2b7f">Pending Leave Requests — Action Required</h2>
          <p>Dear ${escalateeName},</p>
          <p>The following leave request${requests.length > 1 ? "s are" : " is"} pending approval for <strong>more than 48 hours</strong> at <strong>${org?.name ?? orgId}</strong>. Please review and take action.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
            <thead>
              <tr style="background:#f8fafc;color:#555">
                <th style="padding:8px 10px;text-align:left">Employee</th>
                <th style="padding:8px 10px;text-align:left">Type</th>
                <th style="padding:8px 10px;text-align:left">Dates</th>
                <th style="padding:8px 10px;text-align:left">Submitted</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
          <p><a href="${process.env.NEXTAUTH_URL ?? ""}/hr/leaves" style="color:#bd882c;font-weight:bold">Review in HR Portal →</a></p>
          <p style="color:#888;font-size:11px;margin-top:24px">
            This is an automated escalation from the StreamlineOS HR system.
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: escalationTarget.email,
          subject: `[Escalation] ${requests.length} Leave Request${requests.length > 1 ? "s" : ""} Pending > 48h`,
          html,
        });
        escalated += requests.length;
      } catch (e) {
        logger.error("leave-escalation: failed to send email", {
          error: e,
          orgId,
          to: escalationTarget.email,
        });
      }
    }

    return { escalated };
  }
);
