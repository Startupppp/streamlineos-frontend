import sgMail from "@sendgrid/mail";
import { logger } from "../logger";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  type: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

function isTransientError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code = (error as { code?: number | string }).code;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return true;
    }
    const statusCode = (error as { code?: number; statusCode?: number }).statusCode ?? (typeof code === "number" ? code : undefined);
    if (typeof statusCode === "number") {
      if (statusCode >= 500 && statusCode < 600) return true;
      if (statusCode >= 400 && statusCode < 500) return false;
    }
  }
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(options: EmailOptions) {
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL || "noreply@vaivammcapital.com";

  if (!process.env.SENDGRID_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      logger.info("Email skipped - No SendGrid API Key", { to: options.to, subject: options.subject });
    }
    return Promise.resolve();
  }

  const attachments = options.attachments?.map((a) => ({
    content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    filename: a.filename,
    type: a.type,
    disposition: "attachment" as const,
  }));

  const msg = {
    to: options.to,
    from: fromEmail,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ""),
    ...(attachments?.length ? { attachments } : {}),
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sgMail.send(msg);
      if (process.env.NODE_ENV === "development") {
        logger.info("Email sent", { to: options.to, subject: options.subject });
      }
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientError(error)) {
        logger.error("Email send failed with non-retryable error", {
          to: options.to,
          subject: options.subject,
          attempt,
          error,
        });
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`Email send failed, retrying (attempt ${attempt}/${MAX_RETRIES})`, {
          to: options.to,
          subject: options.subject,
          attempt,
          nextRetryMs: backoff,
          error,
        });
        await delay(backoff);
      }
    }
  }

  logger.error("Email send failed after all retries exhausted", {
    to: options.to,
    subject: options.subject,
    totalAttempts: MAX_RETRIES,
    error: lastError,
  });
  throw lastError;
}
