import { z } from "zod";

const emailString = z.string().email("Enter a valid email address");

export const mailComposeSchema = z.object({
  accountId: z.number({ error: "Select a sending account" }),
  to: z.array(emailString).min(1, "At least one recipient is required"),
  cc: z.array(emailString).optional(),
  bcc: z.array(emailString).optional(),
  subject: z.string().max(500, "Subject must be 500 characters or fewer"),
  bodyHtml: z.string().min(1, "Message body is required"),
});

export type MailComposeValues = z.infer<typeof mailComposeSchema>;

export const mailReplySchema = z.object({
  accountId: z.number({ error: "Select a sending account" }),
  to: z.array(emailString).min(1, "At least one recipient is required"),
  cc: z.array(emailString).optional(),
  bodyHtml: z.string().min(1, "Message body is required"),
  messageId: z.string(),
  threadId: z.string().optional(),
});

export type MailReplyValues = z.infer<typeof mailReplySchema>;

export type MailComposeMode =
  | { type: "compose" }
  | {
      type: "reply";
      messageId: string;
      threadId?: string;
      toEmail: string;
      subject: string;
      accountId: number;
      prefillBody?: string;
    };
