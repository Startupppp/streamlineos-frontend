/**
 * Twilio SMS + WhatsApp helper.
 * Uses Twilio REST API directly — no SDK dependency required.
 * Gracefully skips sending if TWILIO_* env vars are not configured.
 */

import { logger } from "./logger";

interface TwilioSendParams {
  to: string; // E.164 format e.g. "+919876543210"
  body: string;
  channel: "sms" | "whatsapp";
}

interface TwilioResponse {
  sid: string;
  status: string;
  errorCode?: number;
  errorMessage?: string;
}

function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

/**
 * Send a message via Twilio SMS or WhatsApp.
 * Returns { sent: true } on success, { sent: false, reason } if skipped/failed.
 */
export async function sendTwilioMessage(
  params: TwilioSendParams
): Promise<{ sent: boolean; sid?: string; reason?: string }> {
  if (!isTwilioConfigured()) {
    logger.info("Twilio not configured — skipping message", {
      channel: params.channel,
      to: params.to,
    });
    return { sent: false, reason: "not_configured" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;

  const from =
    params.channel === "whatsapp"
      ? `whatsapp:${fromNumber}`
      : fromNumber;

  const to =
    params.channel === "whatsapp"
      ? `whatsapp:${params.to}`
      : params.to;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("From", from);
  formData.append("Body", params.body);

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const json = (await res.json()) as TwilioResponse;

    if (!res.ok) {
      logger.error("Twilio send failed", {
        channel: params.channel,
        to: params.to,
        errorCode: json.errorCode,
        errorMessage: json.errorMessage,
        status: res.status,
      });
      return { sent: false, reason: json.errorMessage ?? `HTTP ${res.status}` };
    }

    logger.info("Twilio message sent", {
      channel: params.channel,
      to: params.to,
      sid: json.sid,
    });

    return { sent: true, sid: json.sid };
  } catch (error) {
    logger.error("Twilio request threw", { channel: params.channel, error });
    return { sent: false, reason: "request_error" };
  }
}

/**
 * Send SMS. Falls back gracefully if Twilio not configured.
 */
export async function sendSms(
  to: string,
  body: string
): Promise<{ sent: boolean; sid?: string; reason?: string }> {
  return sendTwilioMessage({ to, body, channel: "sms" });
}

/**
 * Send WhatsApp message. Falls back gracefully if Twilio not configured.
 */
export async function sendWhatsApp(
  to: string,
  body: string
): Promise<{ sent: boolean; sid?: string; reason?: string }> {
  return sendTwilioMessage({ to, body, channel: "whatsapp" });
}

/**
 * Send via WhatsApp first; if it fails (or no WhatsApp configured),
 * fall back to SMS.
 */
export async function sendWhatsAppWithSmsFallback(
  to: string,
  body: string
): Promise<{ channel: "whatsapp" | "sms" | "none"; sid?: string }> {
  const waResult = await sendWhatsApp(to, body);
  if (waResult.sent) return { channel: "whatsapp", sid: waResult.sid };

  const smsResult = await sendSms(to, body);
  if (smsResult.sent) return { channel: "sms", sid: smsResult.sid };

  return { channel: "none" };
}
