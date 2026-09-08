import { z } from "zod";
import { idCursorPageContract } from "@/hooks/api/id-cursor-page-schema";

/**
 * Response contracts for the notifications family.
 * Derived from backend `notification-response-schema.ts` and
 * `notification-admin-response.schemas.ts`.
 * NOT `.strict()` unless the backend schema is.
 */

const notificationItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string().nullable(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  category: z.enum([
    "SECURITY", "CRM", "HRMS", "BILLING", "AI", "PROJECTS", "WORKFLOW",
    "MARKETING", "SYSTEM", "CHAT", "PAYROLL", "RECRUITMENT", "KNOWLEDGE",
    "SIGN", "INVENTORY", "SURVEYS", "CALENDAR", "SUPPORT",
  ]),
  sourceModule: z.string().nullable(),
  eventKey: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  title: z.string(),
  message: z.string().nullable(),
  link: z.string().nullable(),
  isRead: z.boolean(),
  pinned: z.boolean(),
  channel: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  archivedAt: z.string().nullable(),
  snoozedUntil: z.string().nullable(),
  createdAt: z.string(),
  actions: z
    .array(z.object({ label: z.string(), url: z.string().optional(), action: z.string().optional() }))
    .optional(),
});

/** Keyset page of notifications — `notificationListResponseSchema`. */
export const notificationListContract = idCursorPageContract(notificationItemContract);

/** Unread count — `notificationCountResponseSchema`. */
export const notificationCountContract = z
  .object({ count: z.number().int().nonnegative() })
  .strict();

/** Generic mutation ack — `notificationSuccessResponseSchema`. */
export const notificationAckContract = z.object({ success: z.literal(true) }).strict();

/** Provider row — `notificationProviderRowSchema`. */
export const notificationProviderContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "WEBHOOK"]),
  provider: z.enum(["SMTP", "TWILIO", "META_WHATSAPP", "WEBHOOK", "WEB_PUSH", "INTERNAL", "SANDBOX"]),
  displayName: z.string(),
  enabled: z.boolean(),
  sandboxMode: z.boolean(),
  isDefault: z.boolean(),
  dailySendLimit: z.number().int().nullable(),
  monthlyCostLimit: z.number().int().nullable(),
  healthStatus: z.string(),
  lastTestedAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasCredentials: z.boolean(),
});

/** `notificationProvidersListSchema` */
export const notificationProvidersListContract = z.array(notificationProviderContract);

/** `notificationProviderTestSchema` */
export const notificationProviderTestContract = z.object({
  status: z.enum(["SENT", "FAILED"]),
  sandbox: z.boolean(),
  message: z.string(),
  providerMessageId: z.string().nullable(),
});

const notificationChannelEnum = z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "WEBHOOK"]);
const notificationPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]);
const notificationTypeEnum = z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]);

const notificationEventDefinitionBase = z.object({
  eventKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.string(),
  sourceModule: z.string(),
  defaultPriority: notificationPriorityEnum,
  defaultType: notificationTypeEnum,
  defaultChannels: z.array(notificationChannelEnum),
  allowedChannels: z.array(notificationChannelEnum),
  mandatory: z.boolean(),
  userConfigurable: z.boolean(),
  adminConfigurable: z.boolean(),
  quietHoursBehavior: z.enum(["respect", "bypass_if_high", "always_bypass"]),
  dedupeWindowSeconds: z.number().int(),
  rateLimitWindowSeconds: z.number().int(),
  rateLimitMax: z.number().int(),
  templateKey: z.string().optional(),
  audienceResolver: z.string().optional(),
  enabled: z.boolean(),
  overridden: z.boolean(),
});

/** `notificationEventsListSchema` */
export const notificationEventsListContract = z.array(notificationEventDefinitionBase);

/** `notificationEventDefinitionSchema` (single row update) */
export const notificationEventDefinitionContract = notificationEventDefinitionBase;

const policyOverrideSchema = z.object({
  channels: z.array(notificationChannelEnum).optional(),
  muted: z.boolean().optional(),
});

const notificationPolicyBase = z.object({
  id: z.number().int(),
  orgId: z.string(),
  scopeType: z.enum(["ORG", "ROLE", "DEPARTMENT", "TEAM", "PROJECT"]),
  scopeId: z.string().nullable(),
  defaultChannels: z.array(notificationChannelEnum),
  eventOverrides: z.record(z.string(), policyOverrideSchema),
  categoryOverrides: z.record(z.string(), policyOverrideSchema),
  moduleOverrides: z.record(z.string(), policyOverrideSchema),
  canUserOverride: z.boolean(),
  resolutionOrder: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `notificationPolicyListSchema` */
export const notificationPoliciesListContract = z.array(notificationPolicyBase);

/** `notificationPolicyRowSchema` */
export const notificationPolicyRowContract = notificationPolicyBase;

/** `notificationPreferenceSchema` */
export const notificationPreferenceContract = z.object({
  id: z.number().int(),
  userId: z.string(),
  orgId: z.string(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  quietHoursWeekends: z.boolean(),
  allowCriticalOverride: z.boolean(),
  digestMode: z.enum(["disabled", "hourly", "daily", "weekly"]),
  categories: z.record(z.string(), z.boolean()),
  channelCategories: z.record(z.string(), z.record(z.string(), z.boolean())),
  eventPreferences: z.record(z.string(), z.unknown()),
  modulePreferences: z.record(z.string(), z.unknown()),
  inherited: z
    .object({ defaultChannels: z.array(z.string()), canUserOverride: z.boolean() })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const suppressionBase = z.object({
  id: z.number().int(),
  scopeType: z.enum(["event", "module", "category"]),
  scopeKey: z.string(),
  channel: notificationChannelEnum.nullable(),
  reason: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

/** `notificationSuppressionsListSchema` */
export const suppressionsListContract = z.array(suppressionBase);

/** `suppressionRowSchema` */
export const suppressionRowContract = suppressionBase;

/** `notificationSuccessSchema` */
export const notificationSuccessContract = z.object({ success: z.literal(true) });

/**
 * `NotificationDispatchService.emitNow` -> `DispatchResult`
 * (`notification-dispatch.service.ts`). Written from that interface, NOT from
 * the module's `notificationEmitSchema`, which declares `{ chunkInput, dedupeKey }`
 * — a copy of a neighbouring schema that passes vacuously (`z.unknown()` on an
 * absent key) and describes nothing this handler returns.
 */
export const notificationEmitContract = z.object({
  eventKey: z.string(),
  notified: z.number().int(),
  deliveriesQueued: z.number().int(),
  suppressed: z.number().int(),
  deduped: z.number().int(),
  deferred: z.boolean(),
  failedRecipients: z.number().int(),
});

/** `notificationTemplateRowSchema` */
export const notificationTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  templateKey: z.string(),
  name: z.string(),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "WEBHOOK"]),
  category: z.enum([
    "SECURITY", "CRM", "HRMS", "BILLING", "AI", "PROJECTS", "WORKFLOW",
    "MARKETING", "SYSTEM", "CHAT", "PAYROLL", "RECRUITMENT", "KNOWLEDGE",
    "SIGN", "INVENTORY", "SURVEYS", "CALENDAR", "SUPPORT",
  ]),
  locale: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  variables: z.array(z.string()),
  version: z.number().int(),
  isActive: z.boolean(),
  approvalStatus: z.enum(["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"]),
  providerTemplateName: z.string().nullable(),
  approvalCheckedAt: z.string().nullable(),
  approvalRejectionReason: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `notificationTemplatesListSchema` — offset page of templates. */
export const notificationTemplatesListContract = z.object({
  items: z.array(notificationTemplateContract),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

/** `templatePreviewSchema` */
export const templatePreviewContract = z.object({
  subject: z.string().nullable(),
  body: z.string(),
  channel: z.string().optional(),
  templateKey: z.string().optional(),
});

const broadcastAudienceSchema = z.object({
  type: z.enum(["all", "roles", "departments", "users"]),
  roleIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

/** `broadcastRowSchema` */
export const broadcastRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  message: z.string(),
  type: notificationTypeEnum,
  priority: notificationPriorityEnum,
  category: z.enum([
    "SECURITY", "CRM", "HRMS", "BILLING", "AI", "PROJECTS", "WORKFLOW",
    "MARKETING", "SYSTEM", "CHAT", "PAYROLL", "RECRUITMENT", "KNOWLEDGE",
    "SIGN", "INVENTORY", "SURVEYS", "CALENDAR", "SUPPORT",
  ]),
  channels: z.array(z.string()),
  audience: broadcastAudienceSchema,
  status: z.enum(["DRAFT", "SCHEDULED", "QUEUED", "SENDING", "SENT", "CANCELLED", "FAILED"]),
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  recipientCount: z.number().int(),
  deliveredCount: z.number().int(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `broadcastListResponseSchema` — cursor page with integer cursor. */
export const broadcastListContract = z.object({
  items: z.array(broadcastRowContract),
  nextCursor: z.number().int().optional(),
});

/** `broadcastSuccessSchema` */
export const broadcastSuccessContract = z.object({ success: z.literal(true) });

