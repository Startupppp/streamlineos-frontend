export type MailProvider = "gmail" | "outlook";

export type MailFolder = "inbox" | "sent" | "archive" | "trash" | "starred";

export interface MailAccount {
  id: number;
  provider: MailProvider;
  accountEmail: string | null;
  accountLabel: string | null;
  status: "active" | "needs_reauth" | "disabled";
  isPrimary: boolean;
}

export interface MailAddress {
  name: string | null;
  email: string;
}

export interface MailMessageSummary {
  id: string;
  threadId: string | null;
  accountId: number;
  provider: MailProvider;
  from: MailAddress;
  to: MailAddress[];
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

export interface MailAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: MailAddress[];
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: MailAttachment[];
}

export interface MailListResponse {
  messages: MailMessageSummary[];
  nextCursor: string | null;
  accountErrors: { accountId: number; accountEmail: string | null; message: string }[];
}

export type MailAction = "markRead" | "markUnread" | "star" | "unstar" | "archive" | "trash";

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
}
