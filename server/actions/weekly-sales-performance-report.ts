"server-only";

import { db } from "@/lib/db";
import { leads, deals, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function generateWeeklySalesPerformanceReport(
  orgId: string,
  orgName: string
): Promise<{ sent: boolean; recipientCount: number }> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekLeads = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      gte(leads.createdAt, weekAgo)
    ),
    with: {
      assignedTo: { columns: { id: true, name: true } },
    },
  });

  const salesMap = new Map<
    string,
    { name: string; assigned: number; closedOrWon: number }
  >();

  for (const lead of weekLeads) {
    const uid = lead.assignedToId ?? "__unassigned__";
    const entry = salesMap.get(uid) ?? {
      name: lead.assignedTo?.name ?? "Unassigned",
      assigned: 0,
      closedOrWon: 0,
    };
    entry.assigned++;
    if (lead.status === "CONVERTED" || lead.status === "LOST") {
      entry.closedOrWon++;
    }
    salesMap.set(uid, entry);
  }

  const weekDeals = await db.query.deals.findMany({
    where: and(
      eq(deals.orgId, orgId),
      gte(deals.updatedAt, weekAgo),
      sql`${deals.stage} IN ('WON', 'LOST')`
    ),
    with: {
      assignedTo: { columns: { id: true, name: true } },
    },
  });

  const dealsWon = weekDeals.filter((d) => d.stage === "WON");
  const dealsLost = weekDeals.filter((d) => d.stage === "LOST");
  const totalDealValue = dealsWon.reduce(
    (sum, d) => sum + Number(d.value ?? 0),
    0
  );

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
    logger.info("Weekly sales report: no recipients found", { orgId });
    return { sent: false, recipientCount: 0 };
  }

  const weekStart = weekAgo.toDateString();
  const weekEnd = now.toDateString();
  const subject = `Weekly Sales Performance Report - ${orgName}`;

  const salespersonLines = [...salesMap.entries()]
    .filter(([uid]) => uid !== "__unassigned__")
    .map(
      ([, v]) =>
        `  ${v.name}: ${v.assigned} assigned, ${v.closedOrWon} closed/won`
    )
    .join("\n");

  const plainText = [
    `Weekly Sales Performance Report for ${orgName}`,
    `Period: ${weekStart} — ${weekEnd}`,
    "",
    `Total new leads this week: ${weekLeads.length}`,
    `Deals won this week: ${dealsWon.length}`,
    `Deals lost this week: ${dealsLost.length}`,
    `Total won deal value: ${totalDealValue.toLocaleString("en-IN", { style: "currency", currency: "INR" })}`,
    "",
    "Salesperson breakdown (new leads this week):",
    salespersonLines || "  (no assigned leads)",
    "",
    "---",
    "This is an automated report from Vaivamm Capital.",
  ].join("\n");

  const salespersonRows = [...salesMap.entries()]
    .filter(([uid]) => uid !== "__unassigned__")
    .map(
      ([, v]) =>
        `<tr>` +
        `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${v.name}</td>` +
        `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${v.assigned}</td>` +
        `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${v.closedOrWon}</td>` +
        `</tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#0f2b7f 0%,#bd882c 100%);padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;">Weekly Sales Performance Report</h2>
        <p style="color:#fef9c3;margin:4px 0 0;">${orgName} — ${weekStart} to ${weekEnd}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">New leads this week</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${weekLeads.length}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">Deals won</td>
            <td style="padding:12px;border:1px solid #e5e7eb;">${dealsWon.length}</td>
          </tr>
          <tr>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;">Deals lost</td>
            <td style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;">${dealsLost.length}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">Total won deal value</td>
            <td style="padding:12px;border:1px solid #e5e7eb;">&#8377;${totalDealValue.toLocaleString("en-IN")}</td>
          </tr>
        </table>
        <h3 style="color:#0f2b7f;">Salesperson Breakdown (New Leads This Week)</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Salesperson</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Assigned</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Closed/Won</th>
          </tr>
          ${
            salespersonRows ||
            `<tr><td colspan="3" style="padding:8px 12px;border:1px solid #e5e7eb;color:#9ca3af;">No assigned leads this week</td></tr>`
          }
        </table>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Automated report from Vaivamm Capital. Do not reply.</p>
      </div>
    </body></html>
  `;

  for (const email of recipientEmails) {
    try {
      await sendEmail({ to: email, subject, html, text: plainText });
    } catch (err) {
      logger.error("Weekly sales report: failed to send email", { orgId, email, error: err });
    }
  }

  return { sent: true, recipientCount: recipientEmails.length };
}
