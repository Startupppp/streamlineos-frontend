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

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORY_VALUES)[number];

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

export interface NotificationTicketAssignee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface NotificationTicketContext {
  ticketId: number;
  ticketKey: string;
  priority: string | null;
  status: string | null;
  type: string | null;
  assignee: NotificationTicketAssignee | null;
}

export interface Notification {
  id: number;
  orgId: string;
  userId: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  sourceModule: string | null;
  eventKey?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  reason?: string | null;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  pinned: boolean;
  channel: string;
  metadata?: Record<string, unknown> | null;
  ticketContext?: NotificationTicketContext | null;
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
  projectId?: number;
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
  /**
   * COMP-004 / COMP-005. WhatsApp and SMS refuse to send a template the provider has not
   * approved, so this is the only thing that makes those channels usable. Approval itself
   * happens out-of-band (Meta, or an Indian DLT operator); we record the outcome.
   */
  approvalStatus: TemplateApprovalStatus;
  providerTemplateName: string | null;
  approvalCheckedAt: Date | string | null;
  approvalRejectionReason: string | null;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type TemplateApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export interface SetTemplateApprovalInput {
  approvalStatus: TemplateApprovalStatus;
  providerTemplateName?: string | null;
  approvalRejectionReason?: string | null;
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

export interface BroadcastListResponse {
  items: Broadcast[];
  nextCursor?: number;
}

export interface NotificationPreferences {
  id: number;
  userId: string;
  orgId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
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
  whatsappEnabled?: boolean;
  inAppEnabled?: boolean;
  soundEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  digestMode?: DigestMode;
  categories?: Record<string, boolean>;
  channelCategories?: Record<string, Record<string, boolean>>;
}

export type NotificationProviderName =
  | "SMTP"
  | "TWILIO"
  | "META_WHATSAPP"
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

export type UpdateProviderInput = Partial<
  Omit<CreateProviderInput, "channel" | "provider">
>;

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

export type PolicyScopeType =
  | "ORG"
  | "ROLE"
  | "DEPARTMENT"
  | "TEAM"
  | "PROJECT";

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

export type SuppressionScopeType = "event" | "module" | "category";

export interface SuppressionRule {
  id: number;
  scopeType: SuppressionScopeType;
  scopeKey: string;
  channel: NotificationChannel | null;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateSuppressionInput {
  scopeType: SuppressionScopeType;
  scopeKey: string;
  channel?: NotificationChannel;
  expiresAt?: string;
}
