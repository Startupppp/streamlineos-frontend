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
  approvalKind: string;
  priority: string;
  projectId: number | null;
  ticketId: number | null;
  dueAt: string | null;
};

export type ModuleTaskInboxItem = InboxItemBase & {
  kind: "module_task";
  id: string;
  taskKind: string;
  status: string;
  priority: string;
  dueAt: string | null;
  body: string;
};

export type UnifiedInboxItem =
  | NotificationInboxItem
  | BroadcastInboxItem
  | MailInboxItem
  | BuildApprovalInboxItem
  | ModuleTaskInboxItem;

export type InboxSourceStatus = {
  kind: "notification" | "broadcast" | "mail" | "build_approval" | "module_task";
  included: boolean;
  reason: string | null;
  available: boolean;
  error: string | null;
};

export type UnifiedInboxResponse = {
  items: UnifiedInboxItem[];
  hasMore: boolean;
  nextCursor: string | null;
  sources: InboxSourceStatus[];
  degraded: boolean;
};

export type InboxKind = UnifiedInboxItem["kind"];

export type UnifiedInboxCount = {
  notification: number;
  mail: number;
  approval: number;
  task: number;
  total: number;
  mailExact: boolean;
};
