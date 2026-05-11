import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, lte, gte, inArray, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { LEAVE_POLICY, ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";
import { ROLES } from "@/lib/constants/roles";
import { HR_LEAVE_NOTIFY_EMAIL } from "@/lib/constants/hr-leave-routing";
import { ensureLeaveTypes, ensureUserBalances } from "@/server/actions/leave-actions/leave-balance";
import { notifyByRoles } from "@/server/actions/create-notification";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { sendLeaveRequestEmail } from "@/lib/email";

const createLeaveSchema = z.object({
  leaveTypeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  /** Ignored: leave requests are routed to HR automatically */
  approverId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["AM", "PM"]).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;

    const seededTypes = await ensureLeaveTypes(orgId);
    const allowedSeeded = seededTypes
      .filter((t) => ALLOWED_LEAVE_TYPE_NAMES.has(t.name))
      .map((t) => ({ id: t.id, name: t.name, daysPerYear: t.daysPerYear }));
    await ensureUserBalances(orgId, userId, allowedSeeded);

    const [rawBalances, allTypes, requests, user, member] = await Promise.all([
      db
        .select({
          id: leaveBalances.id,
          leaveTypeId: leaveBalances.leaveTypeId,
          balance: leaveBalances.balance,
          typeName: leaveTypes.name,
          daysPerYear: leaveTypes.daysPerYear,
        })
        .from(leaveBalances)
        .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
        .where(
          and(
            eq(leaveBalances.userId, userId),
            eq(leaveBalances.orgId, orgId),
            eq(leaveBalances.year, new Date().getFullYear()),
          ),
        ),
      db.query.leaveTypes.findMany({ where: eq(leaveTypes.orgId, orgId) }),
      db.query.leaveRequests.findMany({
        where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.orgId, orgId)),
        with: {
          leaveType: { columns: { id: true, name: true, daysPerYear: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
      }),
      db.query.users.findFirst({ where: eq(users.id, userId), columns: { joiningDate: true } }),
      db.query.organizationMembers.findFirst({ where: eq(organizationMembers.userId, userId) }),
    ]);

    const seenNames = new Set<string>();
    const balances = rawBalances.filter((b) => {
      if (!b.typeName || !ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) || seenNames.has(b.typeName)) return false;
      seenNames.add(b.typeName);
      return true;
    });

    const seenTypeNames = new Set<string>();
    const types = allTypes.filter((t) => {
      if (seenTypeNames.has(t.name)) return false;
      seenTypeNames.add(t.name);
      return true;
    });

    let approvers: Array<Record<string, unknown>> = [];
    if (member) {
      const role = member.role;
      const targetRoles =
        role === ROLES.CEO
          ? [ROLES.HR, ROLES.ADMIN]
          : role === ROLES.HR
          ? [ROLES.CEO, ROLES.ADMIN]
          : [ROLES.ADMIN, ROLES.HR, ROLES.CEO];

      const approverMembers = await db.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.orgId, orgId),
          inArray(organizationMembers.role, targetRoles),
        ),
        with: { user: true },
      });
      approvers = approverMembers
        .filter((m) => m.userId !== userId && m.user)
        .map((m) => m.user as Record<string, unknown>);
    }

    return ok({
      balances,
      types,
      requests,
      joiningDate: user?.joiningDate ?? null,
      approvers,
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await parseBody(req, createLeaveSchema);

      if (!body.leaveTypeId || !body.startDate || !body.endDate) {
        return err("leaveTypeId, startDate, and endDate are required.", 400);
      }

      if (body.startDate > body.endDate) {
        return err("Start date must be before or equal to end date.", 400);
      }

      const requestedDays = body.isHalfDay
        ? 0.5
        : Math.round(
            Math.abs(
              new Date(body.endDate).getTime() - new Date(body.startDate).getTime()
            ) / (1000 * 60 * 60 * 24)
          ) + 1;

      const [balance, leaveType] = await Promise.all([
        db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, session.user.id),
            eq(leaveBalances.orgId, session.orgId),
            eq(leaveBalances.leaveTypeId, body.leaveTypeId),
            eq(leaveBalances.year, new Date().getFullYear())
          ),
        }),
        db.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, body.leaveTypeId),
          columns: { name: true },
        }),
      ]);

      const isUnpaid = leaveType?.name === LEAVE_POLICY.UNPAID.name;
      if (!isUnpaid && balance && Number(balance.balance) < requestedDays) {
        return err(
          `Insufficient leave balance. Available: ${balance.balance}, Required: ${requestedDays}`,
          400
        );
      }

      const overlapping = await db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.orgId, session.orgId),
          lte(leaveRequests.startDate, formatDateOnly(new Date(body.endDate))),
          gte(leaveRequests.endDate, formatDateOnly(new Date(body.startDate)))
        ),
      });

      if (overlapping && overlapping.status !== "REJECTED") {
        return err(
          "You already have a leave request for overlapping dates.",
          400
        );
      }

      await db.insert(leaveRequests).values({
        orgId: session.orgId,
        userId: session.user.id,
        leaveTypeId: body.leaveTypeId,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        reason: body.reason,
        priority: body.priority ?? "MEDIUM",
        approverId: null,
        attachmentUrl: body.attachmentUrl ?? null,
        isHalfDay: body.isHalfDay ?? false,
        halfDayPeriod: body.halfDayPeriod ?? null,
        status: "PENDING",
      });

      const startStr = formatDateOnly(new Date(body.startDate));
      const endStr = formatDateOnly(new Date(body.endDate));
      const leaveLabel = leaveType?.name ?? "Leave";
      const reasonText = body.reason ?? "No reason provided";
      const employeeName = session.user.name ?? "Employee";

      void (async () => {
        const hrMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, session.orgId),
              eq(organizationMembers.role, ROLES.HR)
            )
          );

        const emailed = new Set<string>();

        for (const m of hrMembers) {
          const hrUser = await db.query.users.findFirst({
            where: eq(users.id, m.userId),
            columns: { email: true, name: true },
          });
          if (!hrUser?.email) continue;
          const key = hrUser.email.trim().toLowerCase();
          if (emailed.has(key)) continue;
          emailed.add(key);
          await sendLeaveRequestEmail(
            hrUser.email,
            hrUser.name ?? "HR",
            employeeName,
            leaveLabel,
            startStr,
            endStr,
            reasonText
          );
        }

        const inboxKey = HR_LEAVE_NOTIFY_EMAIL.toLowerCase();
        if (!emailed.has(inboxKey)) {
          emailed.add(inboxKey);
          await sendLeaveRequestEmail(
            HR_LEAVE_NOTIFY_EMAIL,
            "HR",
            employeeName,
            leaveLabel,
            startStr,
            endStr,
            reasonText
          );
        }

        await notifyByRoles(session.orgId, [ROLES.HR], {
          type: "WARNING",
          title: "Leave request pending",
          message: `${employeeName} requested ${leaveLabel} from ${startStr} to ${endStr}.`,
          link: "/hr/leaves",
          excludeUserId: session.user.id,
        });
      })().catch(() => {});

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      return err(message, 400);
    }
  });
}
