"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { platformMessages } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/sender";
import { getAdminRecipients } from "@/lib/email/recipients";
import { logger } from "@/lib/logger";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL, BRAND_URL } from "@/lib/branding";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  company: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  topic: z
    .enum(["sales", "support", "partnership", "press", "other"])
    .default("sales"),
  message: z.string().min(10, "Tell us a little more").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactResult =
  | { ok: true; reference: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof ContactInput, string>>;
    };

const TOPIC_LABEL: Record<ContactInput["topic"], string> = {
  sales: "Talk to sales",
  support: "Get support",
  partnership: "Partnership",
  press: "Press",
  other: "Something else",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAdminNotificationHtml(
  data: ContactInput,
  reference: string,
): string {
  const fields: { label: string; value: string }[] = [
    { label: "Reference", value: reference },
    { label: "Name", value: data.name },
    { label: "Email", value: data.email },
    { label: "Company", value: data.company || "—" },
    { label: "Phone", value: data.phone || "—" },
    { label: "Topic", value: TOPIC_LABEL[data.topic] },
  ];
  const rows = fields
    .map(
      (f) =>
        `<tr><td style="padding:8px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;width:120px;border-bottom:1px solid #e2e8f0;">${escapeHtml(f.label)}</td><td style="padding:8px 16px;color:#0b1220;font-size:14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(f.value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef3fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:24px 32px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 55%,#06b6d4 100%);color:#ffffff;">
      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">${BRAND_NAME} · New contact submission</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">${TOPIC_LABEL[data.topic]} — ${escapeHtml(data.name)}</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="padding:20px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Message</p>
      <p style="margin:0;color:#0b1220;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    </div>
    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
      <a href="${BRAND_URL}/owner/inbox/${reference}" style="color:#3b82f6;text-decoration:none;font-weight:500;">Open in owner inbox →</a>
    </div>
  </div>
</body></html>`;
}

function buildCustomerAutoreplyHtml(data: ContactInput): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef3fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 55%,#06b6d4 100%);color:#ffffff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">Thanks, ${escapeHtml(data.name.split(" ")[0])} — we got it.</h1>
    </div>
    <div style="padding:24px 32px;color:#0b1220;font-size:14px;line-height:1.65;">
      <p style="margin:0 0 14px;">A human on the ${BRAND_NAME} team will reply within one business day. If it&apos;s urgent, reply to this email and it reaches us directly.</p>
      <p style="margin:0 0 14px;color:#64748b;">For reference, the message you sent:</p>
      <div style="padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;color:#475569;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">— The ${BRAND_NAME} team</p>
    </div>
  </div>
</body></html>`;
}

export async function submitContactForm(raw: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ContactInput;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors,
    };
  }
  const data = parsed.data;

  const reference = `MSG-${nanoid(10).toUpperCase()}`;
  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = requestHeaders.get("user-agent") ?? null;
  const referrerUrl = requestHeaders.get("referer") ?? null;

  /* 1. Persist as a platform message — owner sees it in /owner/inbox */
  try {
    await db.insert(platformMessages).values({
      publicCode: reference,
      name: data.name,
      email: data.email,
      company: data.company || null,
      phone: data.phone || null,
      topic: data.topic,
      message: data.message,
      status: "NEW",
      ipAddress,
      userAgent,
      referrerUrl,
    });
    revalidateTag("owner-metrics", "default");
  } catch (error) {
    logger.error("[contact-form] Failed to persist message", { error });
    return {
      ok: false,
      error: "Couldn't save your message. Please try again in a minute.",
    };
  }

  /* 2. Notify the owner team (email — best effort, multi-recipient) */
  const adminRecipients = getAdminRecipients();
  try {
    await sendEmail({
      to: adminRecipients,
      subject: `[${BRAND_NAME}] New ${TOPIC_LABEL[data.topic]} — ${data.name}`,
      html: buildAdminNotificationHtml(data, reference),
      replyTo: data.email,
    });
  } catch (error) {
    logger.error("[contact-form] Admin notification email failed", { error });
  }

  /* 3. Auto-reply to the customer (best effort) */
  try {
    await sendEmail({
      to: data.email,
      subject: `We got your message — ${BRAND_NAME}`,
      html: buildCustomerAutoreplyHtml(data),
      replyTo: BRAND_SUPPORT_EMAIL,
    });
  } catch (error) {
    logger.error("[contact-form] Customer auto-reply failed", { error });
  }

  return { ok: true, reference };
}
