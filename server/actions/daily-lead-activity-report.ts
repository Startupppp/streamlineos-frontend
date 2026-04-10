"server-only";

import { db } from "@/lib/db";
import { leads, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, gte, or, desc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function generateDailyLeadActivityReport(
  orgId: string,
  orgName: string
): Promise<{ sent: boolean; recipientCount: number }> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentLeads = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      or(
        gte(leads.createdAt, since),
        gte(leads.updatedAt, since)
      )
    ),
    with: {
      assignedTo: { columns: { id: true, name: true } },
    },
    orderBy: [desc(leads.updatedAt)],
  });

  const byStatus: Record<string, number> = {};
  for (const lead of recentLeads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
  }

  const newLeadsCount = recentLeads.filter(
    (l) => l.createdAt && new Date(l.createdAt) >= since
  ).length;

  const top5 = recentLeads.slice(0, 5).map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    assignedTo: l.assignedTo?.name ?? "Unassigned",
  }));

  const adminRows = await db
    .select({
      email: users.email,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(users.isActive, true)
      )
    );

  const recipientEmails = [
    ...new Set(
      adminRows
        .filter((r) => ["CEO", "HR", "ADMIN"].includes(r.role))
        .map((r) => r.email)
        .filter((e): e is string => !!e)
    ),
  ];

  if (recipientEmails.length === 0) {
    logger.info("Daily lead report: no recipients found", { orgId });
    return { sent: false, recipientCount: 0 };
  }

  const totalActive = recentLeads.length;
  const subject = `Daily Lead Activity Report - ${orgName}`;

  const plainText = [
    `Daily Lead Activity Summary for ${orgName}`,
    `Period: Last 24 hours (as of ${now.toUTCString()})`,
    "",
    `Total leads (created/updated): ${totalActive}`,
    `New leads today: ${newLeadsCount}`,
    "",
    "Breakdown by status:",
    Object.entries(byStatus).length > 0
      ? Object.entries(byStatus)
          .map(([s, c]) => `  ${s}: ${c}`)
          .join("\n")
      : "  (none)",
    "",
    "Top 5 recently updated leads:",
    top5.length > 0
      ? top5
          .map(
            (l) =>
              `  #${l.id} — ${l.name} | Status: ${l.status} | Assigned: ${l.assignedTo}`
          )
          .join("\n")
      : "  (none)",
    "",
    "---",
    "This is an automated report from Vaivamm Capital.",
  ].join("\n");

  const statusRows =
    Object.entries(byStatus).length > 0
      ? Object.entries(byStatus)
          .map(
            ([s, c]) =>
              `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">${s}</td>` +
              `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${c}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #e5e7eb;color:#9ca3af;">No activity</td></tr>`;

  const top5Rows =
    top5.length > 0
      ? top5
          .map(
            (l) =>
              `<tr>` +
              `<td style="padding:8px 12px;border:1px solid #e5e7eb;">#${l.id}</td>` +
              `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${l.name}</td>` +
              `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${l.status}</td>` +
              `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${l.assignedTo}</td>` +
              `</tr>`
          )
          .join("")
      : `<tr><td colspan="4" style="padding:8px 12px;border:1px solid #e5e7eb;color:#9ca3af;">No recent leads</td></tr>`;

  const html = `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#0f2b7f 0%,#1e40af 100%);padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;">Daily Lead Activity Report</h2>
        <p style="color:#c7d2fe;margin:4px 0 0;">${orgName}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <p style="color:#6b7280;font-size:13px;">Period: Last 24 hours — ${now.toUTCString()}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Total leads (created/updated)</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${totalActive}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">New leads today</td>
            <td style="padding:12px;border:1px solid #e5e7eb;">${newLeadsCount}</td>
          </tr>
        </table>
        <h3 style="color:#0f2b7f;">Breakdown by Status</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Status</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Count</th>
          </tr>
          ${statusRows}
        </table>
        <h3 style="color:#0f2b7f;">Top 5 Recently Updated Leads</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">ID</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Name</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Status</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Assigned To</th>
          </tr>
          ${top5Rows}
        </table>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Automated report from Vaivamm Capital. Do not reply.</p>
      </div>
    </body></html>
  `;

  for (const email of recipientEmails) {
    try {
      await sendEmail({ to: email, subject, html, text: plainText });
    } catch (err) {
      logger.error("Daily lead report: failed to send email", { orgId, email, error: err });
    }
  }

  return { sent: true, recipientCount: recipientEmails.length };
}
