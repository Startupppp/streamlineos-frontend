import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, sendSms, sendWhatsAppWithSmsFallback } from "@/lib/twilio";
import { z } from "zod";
import type { NextRequest } from "next/server";

const dispatchSchema = z.object({
  /** Recipient email address (required when email channel selected) */
  email: z.string().email().optional(),
  /** Recipient phone in E.164 format e.g. "+919876543210" (required for sms/whatsapp) */
  phone: z.string().optional(),
  /** Message subject — used for email */
  subject: z.string().min(1),
  /** Plain-text or HTML body */
  body: z.string().min(1),
  /** Which channels to attempt. Defaults to ["email"]. */
  channels: z
    .array(z.enum(["email", "sms", "whatsapp"]))
    .min(1)
    .default(["email"]),
  /**
   * When true and WhatsApp fails, automatically fall back to SMS.
   * Only relevant when "whatsapp" is in channels.
   */
  whatsappSmsFallback: z.boolean().default(true),
});

type ChannelResult = {
  channel: "email" | "sms" | "whatsapp";
  sent: boolean;
  sid?: string;
  reason?: string;
};

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, dispatchSchema);
    const results: ChannelResult[] = [];

    for (const channel of body.channels) {
      if (channel === "email") {
        if (!body.email) {
          results.push({ channel: "email", sent: false, reason: "no_email_address" });
          continue;
        }
        try {
          await sendEmail({ to: body.email, subject: body.subject, html: body.body });
          results.push({ channel: "email", sent: true });
        } catch (e) {
          results.push({
            channel: "email",
            sent: false,
            reason: e instanceof Error ? e.message : "unknown_error",
          });
        }
        continue;
      }

      if (!body.phone) {
        results.push({ channel, sent: false, reason: "no_phone_number" });
        continue;
      }

      if (channel === "whatsapp") {
        if (body.whatsappSmsFallback) {
          const result = await sendWhatsAppWithSmsFallback(body.phone, body.body);
          if (result.channel === "whatsapp") {
            results.push({ channel: "whatsapp", sent: true, sid: result.sid });
          } else if (result.channel === "sms") {
            results.push({ channel: "whatsapp", sent: false, reason: "fell_back_to_sms" });
            results.push({ channel: "sms", sent: true, sid: result.sid });
          } else {
            results.push({ channel: "whatsapp", sent: false, reason: "all_channels_failed" });
          }
        } else {
          const result = await sendWhatsApp(body.phone, body.body);
          results.push({ channel: "whatsapp", sent: result.sent, sid: result.sid, reason: result.reason });
        }
        continue;
      }

      if (channel === "sms") {
        const result = await sendSms(body.phone, body.body);
        results.push({ channel: "sms", sent: result.sent, sid: result.sid, reason: result.reason });
      }
    }

    const allFailed = results.every((r) => !r.sent);

    return ok({ results, allFailed });
  });
}
