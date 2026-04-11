import nodemailer from "nodemailer";
import { logger } from "../logger";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName?: string;
}

export interface SmtpEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendSmtpEmail(options: SmtpEmailOptions, config?: SmtpConfig): Promise<boolean> {
  const smtpHost = config?.host || process.env.SMTP_HOST;
  const smtpPort = config?.port || Number(process.env.SMTP_PORT || "587");
  const smtpUser = config?.user || process.env.SMTP_USER;
  const smtpPass = config?.pass || process.env.SMTP_PASS;
  const fromEmail = config?.fromEmail || process.env.SMTP_FROM_EMAIL || "noreply@vaivammcapital.com";
  const fromName = config?.fromName || process.env.SMTP_FROM_NAME || "Vaivamm Capital";

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn("SMTP not configured, skipping email send");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    logger.info("SMTP email sent", { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    logger.error("SMTP email failed", { error, to: options.to });
    return false;
  }
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}
