"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { serverApiClient } from "@/lib/api/server-client";
import { requirePlatformOwner } from "@/lib/platform/session";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

const schema = z.object({
  publicCode: z.string().min(1),
  body: z.string().min(1).max(10_000),
});

export type ReplyResult =
  | { ok: true }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReplyHtml(name: string, body: string): string {
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef3fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 28px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 55%,#06b6d4 100%);color:#ffffff;">
      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">${BRAND_NAME} · Re: your message</p>
    </div>
    <div style="padding:24px 28px;color:#0b1220;font-size:14px;line-height:1.65;">
      <p style="margin:0 0 14px;">Hi ${escapeHtml(name.split(" ")[0])},</p>
      <div style="white-space:pre-wrap;">${safeBody}</div>
      <p style="margin:24px 0 4px;color:#94a3b8;font-size:12px;">— The ${BRAND_NAME} team</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">Reply to this email to reach us directly.</p>
    </div>
  </div>
</body></html>`;
}

export async function replyToMessage(raw: unknown): Promise<ReplyResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePlatformOwner();
  const ownerId = session.user!.id as string;

  const message = await serverApiClient.get<{ email: string; name: string } | null>(
    `/platform/messages/${parsed.data.publicCode}`,
  );
  if (!message) return { ok: false, error: "Message not found" };

  try {
    await sendEmail({
      to: message.email,
      subject: `Re: your message to ${BRAND_NAME}`,
      html: buildReplyHtml(message.name, parsed.data.body),
      replyTo: BRAND_SUPPORT_EMAIL,
    });
  } catch (error) {
    logger.error("[owner.replyToMessage] email failed", { error });
    return {
      ok: false,
      error:
        "Email could not be sent. Check that RESEND_API_KEY (or SENDGRID_API_KEY) is set in .env.",
    };
  }

  await serverApiClient.patch(`/platform/messages/${parsed.data.publicCode}/replied`, {
    repliedById: ownerId,
    replyBody: parsed.data.body,
  });

  revalidatePath("/owner/inbox");
  revalidatePath(`/owner/inbox/${parsed.data.publicCode}`);
  revalidateTag("owner-metrics", "default");
  return { ok: true };
}

export async function markMessageStatus(
  publicCode: string,
  status: "READ" | "ARCHIVED" | "NEW",
): Promise<ReplyResult> {
  await requirePlatformOwner();
  await serverApiClient.patch(`/platform/messages/${publicCode}/status`, { status });
  revalidatePath("/owner/inbox");
  revalidateTag("owner-metrics", "default");
  return { ok: true };
}
