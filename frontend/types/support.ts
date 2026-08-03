export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SupportMessageAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface SupportMessage {
  id: number;
  ticketId: number;
  authorId: string;
  body: string;
  isInternal: boolean;
  attachments: SupportMessageAttachment[];
  author: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicket {
  id: number;
  orgId: string;
  title: string;
  category: string | null;
  description: string | null;
  clientId: number | null;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assigneeId: string | null;
  queueId: number | null;
  mergedIntoTicketId: number | null;
  snoozedUntil: Date | null;
  snoozedBy: string | null;
  createdBy: string;
  slaDeadline: Date | null;
  firstResponseDueAt: Date | null;
  firstRespondedAt: Date | null;
  slaPausedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  client: { id: number; name: string } | null;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null } | null;
  messages?: SupportMessage[];
  possibleDuplicateOf?: { id: number; title: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

