"server-only";

import { db } from "@/lib/db";
import { leads, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function generateMonthlyFullSuiteReport(
  orgId: string,
  orgName: string
): Promise<{ sent: boolean; recipientCount: number }> {
  const now = new Date();

  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);

  const monthLabel = firstOfLastMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthLeads = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      gte(leads.createdAt, firstOfLastMonth),
      lte(leads.createdAt, lastOfLastMonth)
    ),
  });

  const totalLeads = monthLeads.length;
  const byStatus: Record<string, number> = {};
  for (const lead of monthLeads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
  }
  const newLeads = byStatus["NEW"] ?? 0;
  const closedLeads = (byStatus["CONVERTED"] ?? 0) + (byStatus["LOST"] ?? 0);
  const convertedLeads = byStatus["CONVERTED"] ?? 0;

  const [headcountResult] = await db
    .select({ count: count() })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(users.isActive, true)
      )
    );
  const headcount = headcountResult?.count ?? 0;

  const memberRows = await db
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
      memberRows
        .filter((r) => ["CEO", "HR"].includes(r.role))
        .map((r) => r.email)
        .filter((e): e is string => !!e)
    ),
  ];

  if (recipientEmails.length === 0) {
    logger.info("Monthly full suite report: no recipients found", { orgId });
    return { sent: false, recipientCount: 0 };
  }

  const subject = `Monthly Report - ${orgName} - ${monthLabel}`;

  const statusLines = Object.entries(byStatus)
    .map(([s, c]) => `  ${s}: ${c}`)
    .join("\n");

  const plainText = [
    `Monthly Full Suite Report for ${orgName}`,
    `Month: ${monthLabel}`,
    "",
    "=== CRM / Leads ===",
    `Total leads: ${totalLeads}`,
    `New leads: ${newLeads}`,
    `Converted leads: ${convertedLeads}`,
    `Closed (converted + lost): ${closedLeads}`,
    "",
    "Leads by status:",
    statusLines || "  (none)",
    "",
    "=== HR ===",
    `Active headcount: ${headcount}`,
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
      : `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #e5e7eb;color:#9ca3af;">No leads this month</td></tr>`;

  const html = `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#0f2b7f 0%,#bd882c 100%);padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;">Monthly Full Suite Report</h2>
        <p style="color:#fef9c3;margin:4px 0 0;">${orgName} — ${monthLabel}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <h3 style="color:#0f2b7f;margin-top:0;">CRM / Lead Summary</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Total leads</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${totalLeads}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">New leads</td>
            <td style="padding:12px;border:1px solid #e5e7eb;">${newLeads}</td>
          </tr>
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Converted leads</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${convertedLeads}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">Closed (converted + lost)</td>
            <td style="padding:12px;border:1px solid #e5e7eb;">${closedLeads}</td>
          </tr>
        </table>
        <h3 style="color:#0f2b7f;">Leads by Status</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Status</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Count</th>
          </tr>
          ${statusRows}
        </table>
        <h3 style="color:#0f2b7f;">HR Overview</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Active headcount</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${headcount}</td>
          </tr>
        </table>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Automated report from Vaivamm Capital. Do not reply.</p>
      </div>
    </body></html>
  `;

  for (const email of recipientEmails) {
    try {
      await sendEmail({ to: email, subject, html, text: plainText });
    } catch (err) {
      logger.error("Monthly full suite report: failed to send email", { orgId, email, error: err });
    }
  }

  return { sent: true, recipientCount: recipientEmails.length };
}
