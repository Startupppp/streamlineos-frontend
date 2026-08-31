export type InboxActor = {
  id: string;
  name: string | null;
  image: string | null;
};

type InboxItemBase = {
  sourceModule: string;
  actor: InboxActor | null;
  subject: string;
  timestamp: string;
  isRead: boolean;
  deepLink: string | null;
  dedupKey: string;
};

export type NotificationInboxItem = InboxItemBase & {
  kind: "notification";
  id: number;
  notifType: string;
  priority: string;
  category: string;
  eventKey: string | null;
  body: string;
  pinned: boolean;
};

export type BroadcastInboxItem = InboxItemBase & {
  kind: "broadcast";
  id: number;
  notifType: string;
  priority: string;
  category: string;
  body: string;
};

export type MailInboxItem = InboxItemBase & {
  kind: "mail";
  id: string;
  threadId: string | null;
  accountId: number;
  snippet: string;
  hasAttachments: boolean;
};

export type BuildApprovalInboxItem = InboxItemBase & {
  kind: "build_approval";
  id: number;
  status: string;
  projectId: number;
  ticketId: number | null;
  dueAt: string | null;
};

export type UnifiedInboxItem =
  | NotificationInboxItem
  | BroadcastInboxItem
  | MailInboxItem
  | BuildApprovalInboxItem;

export type InboxSourceStatus = {
  kind: "notification" | "broadcast" | "mail" | "build_approval";
  included: boolean;
  reason: string | null;
};

export type UnifiedInboxResponse = {
  items: UnifiedInboxItem[];
  hasMore: boolean;
  nextCursor: string | null;
  sources: InboxSourceStatus[];
};

export type InboxKind = UnifiedInboxItem["kind"];

export const INBOX_KINDS = [
  "notification",
  "broadcast",
  "mail",
  "build_approval",
] as const satisfies readonly InboxKind[];
