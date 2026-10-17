import type { z } from "zod";
import type {
  mailAccountContract,
  mailListResponseContract,
  mailMessageContract,
} from "@/hooks/api/mail-schema";

export type MailFolder = "inbox" | "sent" | "archive" | "trash" | "starred";

export type MailAccount = z.infer<typeof mailAccountContract>;

export type MailMessageSummary =
  z.infer<typeof mailListResponseContract>["messages"][number];

export type MailMessageDetail = z.infer<typeof mailMessageContract>;

export type MailListResponse = z.infer<typeof mailListResponseContract>;

type MailAction =
  | "markRead"
  | "markUnread"
  | "star"
  | "unstar"
  | "archive"
  | "trash";

export interface MailActionBody {
  accountId: number;
  action: MailAction;
  threadId?: string;
}

export interface SendMailBody {
  accountId: number;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
}

export interface ReplyMailBody {
  accountId: number;
  messageId: string;
  threadId?: string;
  bodyHtml: string;
  to: string[];
  cc?: string[];
}

export interface MailMessagesParams {
  folder?: MailFolder;
  accountId?: number | "all";
  q?: string;
  limit?: number;
  accountIds?: number[];
}
