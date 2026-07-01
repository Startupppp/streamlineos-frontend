export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationCategory =
  | "SECURITY"
  | "CRM"
  | "HRMS"
  | "BILLING"
  | "AI"
  | "PROJECTS"
  | "WORKFLOW"
  | "MARKETING"
  | "SYSTEM";
export type NotificationSection =
  | "ALL"
  | "UNREAD"
  | "READ"
  | "MENTIONS"
  | "ASSIGNED_TO_ME"
  | "APPROVALS"
  | "BROADCASTS"
  | "ARCHIVED"
  | "SYSTEM"
  | "PINNED";
export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "PUSH"
  | "SMS"
  | "WHATSAPP"
  | "SLACK"
  | "TEAMS"
  | "WEBHOOK";
export type BroadcastStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "CANCELLED"
  | "FAILED";
export type DigestMode = "disabled" | "hourly" | "daily" | "weekly";

export interface Notification {
  id: number;
  orgId: string;
  userId: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  sourceModule: string | null;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  pinned: boolean;
  channel: string;
  sound: boolean;
  archivedAt: Date | string | null;
  snoozedUntil: Date | string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UnreadCount {
  count: number;
}

export interface NotificationListParams {
  section?: NotificationSection;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  sourceModule?: string;
  search?: string;
  limit?: number;
  cursor?: number;
}

export interface NotificationTemplate {
  id: number;
  orgId: string;
  templateKey: string;
  name: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  locale: string;
  subject: string | null;
  body: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTemplateInput {
  templateKey: string;
  name: string;
  channel: NotificationChannel;
  category?: NotificationCategory;
  locale?: string;
  subject?: string;
  body: string;
  variables?: string[];
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export interface TemplatePreviewResult {
  subject: string | null;
  body: string;
}

export interface BroadcastAudience {
  type: "all" | "roles" | "departments" | "users";
  roleIds?: string[];
  departmentIds?: string[];
  userIds?: string[];
}

export interface Broadcast {
  id: number;
  orgId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  channels: string[];
  audience: BroadcastAudience;
  status: BroadcastStatus;
  scheduledAt: Date | string | null;
  sentAt: Date | string | null;
  recipientCount: number;
  deliveredCount: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  channels?: string[];
  audience: BroadcastAudience;
  scheduledAt?: string | null;
}

export type UpdateBroadcastInput = Partial<CreateBroadcastInput>;

export interface NotificationPreferences {
  id: number;
  userId: string;
  orgId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  whatsappEnabled: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
  digestMode: DigestMode;
  categories: Record<string, boolean>;
  channelCategories: Record<string, Record<string, boolean>>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpdatePreferencesInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  slackEnabled?: boolean;
  teamsEnabled?: boolean;
  whatsappEnabled?: boolean;
  soundEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursTimezone?: string;
  digestMode?: DigestMode;
  categories?: Record<string, boolean>;
  channelCategories?: Record<string, Record<string, boolean>>;
}

export interface NotificationAnalyticsOverview {
  total: number;
  delivered: number;
  read: number;
  archived: number;
  readRate: number;
  deliveryRate: number;
  days: number;
}

export interface NotificationAnalyticsByCategory {
  category: string;
  total: number;
  read: number;
  readRate: number;
}

export interface NotificationAnalyticsByPriority {
  priority: string;
  total: number;
  read: number;
  readRate: number;
}

export interface NotificationAnalyticsByChannel {
  channel: string;
  total: number;
  read: number;
  archived: number;
  readRate: number;
}

export interface NotificationAuditLog {
  id: number;
  notificationId: number | null;
  broadcastId: number | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  sourceModule: string | null;
  channel: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date | string;
}

export interface NotificationAuditLogListResult {
  logs: NotificationAuditLog[];
  total: number;
  page: number;
  totalPages: number;
}
