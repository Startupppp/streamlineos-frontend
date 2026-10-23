import { z } from "zod";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { idCursorPageContract } from "@/hooks/api/id-cursor-page-schema";

const notificationItemContract = z
  .object({
    id: z.number().int(),
    orgId: z.string(),
    userId: z.string().nullable(),
    type: z.enum(DB_ENUMS.notification_type),
    priority: z.enum(DB_ENUMS.notification_priority),
    category: z.enum(DB_ENUMS.notification_category),
    sourceModule: z.string().nullable(),
    eventKey: z.string().nullable(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    reason: z.string().nullable(),
    title: z.string(),
    message: z.string(),
    link: z.string().nullable(),
    isRead: z.boolean(),
    pinned: z.boolean(),
    channel: z.string(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    archivedAt: z.string().nullable(),
    snoozedUntil: z.string().nullable(),
    createdAt: z.string(),
    ticketContext: z
      .object({
        ticketId: z.number().int(),
        projectId: z.number().int(),
        projectName: z.string(),
        ticketKey: z.string(),
        ticketTitle: z.string(),
        priority: z.string().nullable(),
        status: z.string().nullable(),
        type: z.string().nullable(),
        assignee: z
          .object({
            id: z.string(),
            name: z.string().nullable(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            image: z.string().nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const notificationListContract = idCursorPageContract(
  notificationItemContract,
);

export const notificationCountContract = z
  .object({ count: z.number().int().nonnegative() })
  .strict();

export const notificationStreamTokenContract = z
  .object({ token: z.string().min(1) })
  .strict();

export const notificationAckContract = z
  .object({ success: z.literal(true) })
  .strict();

export const notificationProviderContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  channel: z.enum(DB_ENUMS.notification_channel),
  provider: z.enum(DB_ENUMS.notification_provider),
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

export const notificationProvidersListContract = z.array(
  notificationProviderContract,
);

export const notificationProviderTestContract = z.object({
  status: z.enum(["SENT", "FAILED"]),
  sandbox: z.boolean(),
  message: z.string(),
  providerMessageId: z.string().nullable(),
});

const notificationChannelEnum = z.enum(DB_ENUMS.notification_channel);
const notificationPriorityEnum = z.enum(DB_ENUMS.notification_priority);
const notificationTypeEnum = z.enum(DB_ENUMS.notification_type);

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
  quietHoursBehavior: z.enum(DB_ENUMS.notification_quiet_hours_behavior),
  dedupeWindowSeconds: z.number().int(),
  rateLimitWindowSeconds: z.number().int(),
  rateLimitMax: z.number().int(),
  templateKey: z.string().optional(),
  audienceResolver: z.string().optional(),
  enabled: z.boolean(),
  overridden: z.boolean(),
});

export const notificationEventsListContract = z.array(
  notificationEventDefinitionBase,
);

export const notificationEventDefinitionContract =
  notificationEventDefinitionBase;

const policyOverrideSchema = z.object({
  channels: z.array(notificationChannelEnum).optional(),
  muted: z.boolean().optional(),
});

const notificationPolicyBase = z.object({
  id: z.number().int(),
  orgId: z.string(),
  scopeType: z.enum(DB_ENUMS.notification_policy_scope),
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

export const notificationPoliciesListContract = z.array(notificationPolicyBase);

export const notificationPolicyRowContract = notificationPolicyBase;

export const notificationPreferenceContract = z.object({
  id: z.number().int().optional(),
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
    .object({
      defaultChannels: z.array(z.string()),
      canUserOverride: z.boolean(),
    })
    .optional(),
  availableChannels: z.array(z.enum(DB_ENUMS.notification_channel)).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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

export const suppressionsListContract = z.array(suppressionBase);

export const suppressionRowContract = suppressionBase;

export const notificationSuccessContract = z.object({
  success: z.literal(true),
});

export const notificationEmitContract = z.object({
  eventKey: z.string(),
  notified: z.number().int(),
  deliveriesQueued: z.number().int(),
  suppressed: z.number().int(),
  deduped: z.number().int(),
  deferred: z.boolean(),
  failedRecipients: z.number().int(),
});

export const notificationTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  templateKey: z.string(),
  name: z.string(),
  channel: z.enum(DB_ENUMS.notification_channel),
  category: z.enum(DB_ENUMS.notification_category),
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

export const notificationTemplatesListContract = z.object({
  items: z.array(notificationTemplateContract),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

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

export const broadcastRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  message: z.string(),
  type: notificationTypeEnum,
  priority: notificationPriorityEnum,
  category: z.enum(DB_ENUMS.notification_category),
  channels: z.array(z.string()),
  audience: broadcastAudienceSchema,
  status: z.enum(DB_ENUMS.broadcast_status),
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  recipientCount: z.number().int(),
  deliveredCount: z.number().int(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const broadcastListContract = z.object({
  items: z.array(broadcastRowContract),
  nextCursor: z.number().int().nullable().optional(),
});

export const broadcastSuccessContract = z.object({ success: z.literal(true) });

export const preferenceRuleRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  membershipId: z.number().int(),
  scopeType: z.enum(["EVENT", "MODULE", "CATEGORY"]),
  scopeKey: z.string(),
  channel: z.string(),
  mode: z.enum(["ON", "OFF", "DIGEST"]),
  updatedAt: z.string(),
});

export const preferenceRulesListContract = z.array(preferenceRuleRowContract);

export const preferenceRuleOkContract = z.object({ ok: z.literal(true) });

export const preferenceEventCatalogItemContract = z.object({
  eventKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.string(),
  sourceModule: z.string().nullable(),
  priority: z.string(),
  defaultChannels: z.array(z.string()),
  allowedChannels: z.array(z.string()),
  mandatory: z.boolean(),
  userConfigurable: z.boolean(),
  userPreference: z.unknown().nullable(),
});

export const preferenceEventCatalogContract = z.array(
  preferenceEventCatalogItemContract,
);

export const consentRowContract = z.object({
  channel: z.string(),
  destination: z.string(),
  state: z.string(),
  source: z.string(),
  legalBasis: z.string(),
  grantedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type NotificationConsent = z.infer<typeof consentRowContract>;
export const consentsListContract = z.array(consentRowContract);

export const templateTestSendContract = z.object({
  success: z.literal(true),
  recipientId: z.string(),
  channel: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  sentAt: z.string(),
});

export const emailTemplatePreviewsContract = z.array(
  z.object({
    id: z.string(),
    category: z.string(),
    name: z.string(),
    subject: z.string(),
    html: z.string(),
    version: z.number().int().positive(),
    locale: z.string(),
    supportedLocales: z.array(z.string()),
  }),
);
export type EmailTemplatePreview = z.infer<typeof emailTemplatePreviewsContract>[number];

export const emailTemplateTestContract = z.object({
  sent: z.literal(true),
  to: z.string(),
  templateId: z.string(),
  locale: z.string(),
  version: z.number().int().positive(),
});
