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
  userId: z.string(),
  eventKey: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  priority: z.string(),
  channels: z.array(z.string()),
  isRead: z.boolean(),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
  isSnoozed: z.boolean(),
  snoozedUntil: z.string().nullable().optional(),
  createdAt: z.string(),
  readAt: z.string().nullable().optional(),
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
  channel: z.string(),
  provider: z.string(),
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
  status: z.string(),
  sandbox: z.boolean(),
  message: z.string(),
  providerMessageId: z.string().nullable(),
});

/** `notificationEventsListSchema` */
export const notificationEventsListContract = z.array(
  z.object({
    eventKey: z.string(),
    displayName: z.string(),
    description: z.string(),
    category: z.string(),
    sourceModule: z.string().nullable(),
    defaultPriority: z.string(),
    defaultChannels: z.array(z.string()),
    allowedChannels: z.array(z.string()),
    mandatory: z.boolean(),
    userConfigurable: z.boolean(),
    enabled: z.boolean(),
    overridden: z.boolean().optional(),
  }),
);

/** `notificationEventDefinitionSchema` (single row update) */
export const notificationEventDefinitionContract = z.object({
  eventKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.string(),
  sourceModule: z.string().nullable(),
  defaultPriority: z.string(),
  defaultChannels: z.array(z.string()),
  allowedChannels: z.array(z.string()),
  mandatory: z.boolean(),
  userConfigurable: z.boolean(),
  enabled: z.boolean(),
  overridden: z.boolean().optional(),
});

/** `notificationPolicyListSchema` */
export const notificationPoliciesListContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    scopeType: z.string(),
    scopeId: z.string().nullable(),
    defaultChannels: z.array(z.string()).nullable(),
    canUserOverride: z.boolean().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

/** `notificationPolicyRowSchema` */
export const notificationPolicyRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  scopeType: z.string(),
  scopeId: z.string().nullable(),
  defaultChannels: z.array(z.string()).nullable(),
  canUserOverride: z.boolean().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `notificationPreferenceSchema` */
export const notificationPreferenceContract = z.object({
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
  digestMode: z.string(),
  categories: z.record(z.string(), z.boolean()),
  channelCategories: z.record(z.string(), z.record(z.string(), z.boolean())),
  eventPreferences: z.record(z.string(), z.unknown()),
  modulePreferences: z.record(z.string(), z.unknown()),
  inherited: z
    .object({ defaultChannels: z.array(z.string()), canUserOverride: z.boolean() })
    .optional(),
});

/** `notificationSuppressionsListSchema` */
export const suppressionsListContract = z.array(
  z.object({
    id: z.number().int(),
    scopeType: z.string(),
    scopeKey: z.string(),
    channel: z.string().nullable(),
    reason: z.string(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  }),
);

/** `suppressionRowSchema` */
export const suppressionRowContract = z.object({
  id: z.number().int(),
  scopeType: z.string(),
  scopeKey: z.string(),
  channel: z.string().nullable(),
  reason: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

/** `notificationSuccessSchema` */
export const notificationSuccessContract = z.object({ success: z.literal(true) });

/** `notificationTemplateRowSchema` */
export const notificationTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  templateKey: z.string(),
  name: z.string(),
  channel: z.string(),
  category: z.string(),
  locale: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  variables: z.array(z.string()),
  version: z.number().int(),
  isActive: z.boolean(),
  approvalStatus: z.string(),
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
});

/** `templatePreviewSchema` */
export const templatePreviewContract = z.object({
  subject: z.string().optional(),
  body: z.string(),
  channel: z.string(),
  templateKey: z.string(),
});

/** `broadcastRowSchema` */
export const broadcastRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  body: z.string(),
  status: z.string(),
  channels: z.array(z.string()),
  audienceType: z.string(),
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `broadcastListResponseSchema` — cursor page with string cursor. */
export const broadcastListContract = z.object({
  items: z.array(broadcastRowContract),
  nextCursor: z.string().nullable(),
});

/** `broadcastSuccessSchema` */
export const broadcastSuccessContract = z.object({ success: z.literal(true) });

/** Unified inbox — loose discriminated union contract. */
export const unifiedInboxContract = z.object({
  items: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      subject: z.string().nullable().optional(),
      from: z.unknown().optional(),
      createdAt: z.string().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  total: z.number().int().optional(),
  nextCursor: z.string().nullable().optional(),
});
