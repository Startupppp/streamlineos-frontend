export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export const NOTIFICATION_CATEGORY_VALUES = [
  "SECURITY",
  "CRM",
  "HRMS",
  "BILLING",
  "AI",
  "PROJECTS",
  "WORKFLOW",
  "MARKETING",
  "SYSTEM",
  "CHAT",
  "PAYROLL",
  "RECRUITMENT",
  "KNOWLEDGE",
  "SIGN",
  "INVENTORY",
  "SURVEYS",
  "CALENDAR",
  "SUPPORT",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORY_VALUES)[number];
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
  eventKey?: string | null;
  reason?: string | null;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  pinned: boolean;
  channel: string;
  archivedAt: Date | string | null;
  snoozedUntil: Date | string | null;
  createdAt: Date | string;
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

export type NotificationProviderName =
  | "SMTP"
  | "SENDGRID"
  | "TWILIO"
  | "META_WHATSAPP"
  | "SLACK"
  | "TEAMS"
  | "WEBHOOK"
  | "WEB_PUSH"
  | "INTERNAL"
  | "SANDBOX";

export type QuietHoursBehavior = "respect" | "bypass_if_high" | "always_bypass";

export interface NotificationProvider {
  id: number;
  orgId: string;
  channel: NotificationChannel;
  provider: NotificationProviderName;
  displayName: string;
  enabled: boolean;
  sandboxMode: boolean;
  isDefault: boolean;
  dailySendLimit: number | null;
  monthlyCostLimit: number | null;
  healthStatus: string;
  lastTestedAt: Date | string | null;
  hasCredentials: boolean;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProviderInput {
  channel: NotificationChannel;
  provider: NotificationProviderName;
  displayName: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  sandboxMode?: boolean;
  isDefault?: boolean;
  dailySendLimit?: number | null;
  monthlyCostLimit?: number | null;
}

export type UpdateProviderInput = Partial<Omit<CreateProviderInput, "channel" | "provider">>;

export interface TestProviderInput {
  to?: string;
}

export interface TestProviderResult {
  status: "SENT" | "FAILED";
  sandbox: boolean;
  message: string;
  providerMessageId: string | null;
}

export interface NotificationEventDefinition {
  eventKey: string;
  sourceModule: string;
  category: string;
  displayName: string;
  description: string;
  defaultPriority: NotificationPriority;
  defaultType: NotificationType;
  defaultChannels: NotificationChannel[];
  allowedChannels: NotificationChannel[];
  mandatory: boolean;
  userConfigurable: boolean;
  adminConfigurable: boolean;
  quietHoursBehavior: QuietHoursBehavior;
  dedupeWindowSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMax: number;
  templateKey?: string;
  audienceResolver?: string;
  enabled: boolean;
  overridden: boolean;
}

export interface EmitTestEventInput {
  eventKey: string;
  targetUserIds: string[];
  title?: string;
  message?: string;
  link?: string;
  priority?: NotificationPriority;
}

export interface DispatchResult {
  eventKey: string;
  notified: number;
  deliveriesQueued: number;
  suppressed: number;
  deduped: number;
}

export interface UpdateEventPolicyInput {
  enabled?: boolean;
  defaultPriority?: NotificationPriority;
  defaultChannels?: NotificationChannel[];
  allowedChannels?: NotificationChannel[];
  mandatory?: boolean;
  userConfigurable?: boolean;
  quietHoursBehavior?: QuietHoursBehavior;
  dedupeWindowSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMax?: number;
}

export type PolicyScopeType = "ORG" | "ROLE" | "DEPARTMENT" | "TEAM" | "PROJECT";

export interface PolicyOverride {
  channels?: NotificationChannel[];
  muted?: boolean;
}

export interface NotificationPolicyDefault {
  id: number;
  orgId: string;
  scopeType: PolicyScopeType;
  scopeId: string | null;
  defaultChannels: NotificationChannel[];
  eventOverrides: Record<string, PolicyOverride>;
  categoryOverrides: Record<string, PolicyOverride>;
  moduleOverrides: Record<string, PolicyOverride>;
  canUserOverride: boolean;
  resolutionOrder: number;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertPolicyInput {
  scopeType?: PolicyScopeType;
  scopeId?: string | null;
  defaultChannels?: NotificationChannel[];
  eventOverrides?: Record<string, PolicyOverride>;
  categoryOverrides?: Record<string, PolicyOverride>;
  moduleOverrides?: Record<string, PolicyOverride>;
  canUserOverride?: boolean;
}
