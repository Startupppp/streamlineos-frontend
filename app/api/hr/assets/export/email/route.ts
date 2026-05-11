import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, organizations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getAssetExportRows } from "@/server/queries/hr/assets-export";
import { buildAssetsCsvString, assetRowsToXlsxSheets } from "@/lib/hr/assets-export-format";
import { buildXlsxBuffer } from "@/lib/export/xlsx-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  format: z.enum(["csv", "xlsx"]),
  /** Match Assets page tab: AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED */
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]).optional(),
  recipients: z.enum(["CEO", "HR", "BOTH"]).optional().default("BOTH"),
});

function rolesForRecipients(target: "CEO" | "HR" | "BOTH"): string[] {
  if (target === "CEO") return ["CEO"];
  if (target === "HR") return ["HR", "BRANCH_HR"];
  return ["HR", "CEO"];
}

async function recipientEmailsForRoles(orgId: string, target: "CEO" | "HR" | "BOTH"): Promise<string[]> {
  const roles = rolesForRecipients(target);
  const rows = await db
    .select({ email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, roles),
        eq(users.isActive, true)
      )
    );
  const set = new Set<string>();
  for (const r of rows) {
    if (r.email?.trim()) set.add(r.email.trim().toLowerCase());
  }
  return [...set];
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!process.env.SENDGRID_API_KEY?.trim()) {
      return err(
        "Email not configured. Set SENDGRID_API_KEY (and EMAIL_FROM_ADDRESS or SENDGRID_FROM_EMAIL).",
        400
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return err(parsed.error.flatten().formErrors.join(", ") || "Invalid body", 400);
    }

    const { format, status, recipients: recipientTarget } = parsed.data;

    const recipients = await recipientEmailsForRoles(session.orgId, recipientTarget);
    if (recipients.length === 0) {
      const hint =
        recipientTarget === "CEO"
          ? "No active CEO with an email found."
          : recipientTarget === "HR"
            ? "No active HR / Branch HR with an email found."
            : "No active HR or CEO members with email found. Add users with HR or CEO role.";
      return err(hint, 400);
    }

    const rows = await getAssetExportRows(session.orgId, status);
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
      columns: { name: true },
    });
    const orgName = org?.name ?? "Organization";
    const filterLabel = status ? ` (${status})` : "";
    const subject = `${orgName} — Assets export${filterLabel}`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename =
      format === "csv"
        ? `assets-export-${dateStr}${status ? `-${status}` : ""}.csv`
        : `assets-export-${dateStr}${status ? `-${status}` : ""}.xlsx`;

    let attachment: { filename: string; content: Buffer; type: string };
    if (format === "csv") {
      const csv = buildAssetsCsvString(rows);
      attachment = {
        filename,
        content: Buffer.from(csv, "utf-8"),
        type: "text/csv",
      };
    } else {
      const buffer = await buildXlsxBuffer(assetRowsToXlsxSheets(rows));
      attachment = {
        filename,
        content: buffer,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    const html = `
      <p>Hi,</p>
      <p>Please find attached the <strong>assets inventory</strong> export for <strong>${escapeHtml(orgName)}</strong>${status ? ` filtered by status: <strong>${escapeHtml(status)}</strong>` : ""}.</p>
      <p>Rows: <strong>${rows.length}</strong></p>
      <p style="color:#64748b;font-size:12px">Sent from Vaivamm CRM — Assets</p>
    `.trim();

    try {
      const { sendEmail } = await import("@/lib/email/sender");
      await sendEmail({
        to: recipients,
        subject,
        html,
        attachments: [attachment],
      });
      return ok({
        sent: true,
        recipients,
        rowCount: rows.length,
        format,
        recipientTarget,
      });
    } catch (e) {
      return err(`Failed to send email: ${e instanceof Error ? e.message : "Unknown error"}`, 502);
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
