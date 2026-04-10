import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";

export interface NotificationPayload {
  orgId: string;
  userId: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  link?: string;
  channel?: "in_app" | "email" | "both";
  sound?: boolean;
  metadata?: Record<string, unknown>;
  recipientEmail?: string;
}

const EMAIL_EVENTS = [
  "Lead Assigned",
  "Lead Converted",
  "Client Invested!",
  "Incentive Approved",
  "Target Achieved",
  "SLA Breach",
];

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const channel = payload.channel || "in_app";
  const isEmailEvent = EMAIL_EVENTS.some(e => payload.title.includes(e));
  const shouldEmail = channel === "email" || channel === "both" || isEmailEvent;

  try {

    await db.insert(notifications).values({
      orgId: payload.orgId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      channel,
      sound: payload.sound ?? isEmailEvent,
      metadata: payload.metadata,
    });

    if (shouldEmail && payload.recipientEmail) {
      const baseUrl = appUrl;
      try {
        await sendEmail({
          to: payload.recipientEmail,
          subject: `${payload.title} — Vaivamm Capital`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="color:#bd882c;margin:0;font-size:22px;">Vaivamm Capital</h1>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
              <h2 style="color:#1e40af;margin-top:0;">${payload.title}</h2>
              <p>${payload.message}</p>
              ${payload.link ? `<div style="text-align:center;margin:24px 0;">
                <a href="${baseUrl}${payload.link}" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Details</a>
              </div>` : ""}
            </div>
          </body></html>`,
        });
      } catch (emailErr) {
        logger.error("Notification email failed", { error: emailErr, userId: payload.userId });
      }
    }
  } catch (error) {
    logger.error("Failed to send notification", { error, userId: payload.userId });
  }
}
