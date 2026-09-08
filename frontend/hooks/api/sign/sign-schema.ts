import { z } from "zod";

const signEnvelopeRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  subject: z.string().nullable(),
  message: z.string().nullable(),
  status: z.enum(["draft", "ready_to_send", "sent", "delivered", "partially_completed", "completed", "declined", "voided", "expired", "correction_required", "failed"]),
  routingMode: z.enum(["parallel", "sequential", "mixed"]),
  ccTiming: z.enum(["on_send", "on_complete"]),
  allowDecline: z.boolean(),
  sourceModule: z.string().nullable(),
  sourceEntityType: z.string().nullable(),
  sourceEntityId: z.string().nullable(),
  templateId: z.number().int().nullable(),
  watermarkPolicyId: z.number().int().nullable(),
  senderMembershipId: z.number().int().nullable(),
  reminderEnabled: z.boolean(),
  reminderFirstAfterDays: z.number().int(),
  reminderRepeatDays: z.number().int(),
  reminderMaxCount: z.number().int(),
  reminderSentCount: z.number().int(),
  lastReminderAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  voidedByMembershipId: z.number().int().nullable(),
  voidReason: z.string().nullable(),
  declinedAt: z.string().nullable(),
  correctionRequiredAt: z.string().nullable(),
  correctionReason: z.string().nullable(),
  finalizationKey: z.string().nullable(),
  finalizedAt: z.string().nullable(),
  finalPdfFileKey: z.string().nullable(),
  finalPdfHash: z.string().nullable(),
  publicFormId: z.number().int().nullable(),
  metadataJson: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signEnvelopeMutationContract = signEnvelopeRowContract;

export const signEnvelopesListContract = z.object({
  items: z.array(signEnvelopeRowContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

const signDocumentRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  envelopeId: z.number().int(),
  originalFileKey: z.string(),
  currentFileKey: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  pageCount: z.number().int().nullable(),
  fileSize: z.number().int(),
  sha256Hash: z.string(),
  conversionStatus: z.enum(["pending", "converted", "failed", "not_needed"]),
  conversionError: z.string().nullable(),
  orderIndex: z.number().int(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const signRecipientRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  envelopeId: z.number().int(),
  roleName: z.string(),
  recipientType: z.enum(["signer", "approver", "cc", "viewer", "in_person_host", "internal_reviewer"]),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  userMembershipId: z.number().int().nullable(),
  routingOrder: z.number().int(),
  status: z.enum(["pending", "invited", "viewed", "authenticated", "signing", "completed", "declined", "delegated", "bounced", "expired"]),
  authMethod: z.enum(["email_link", "access_code", "otp_email", "otp_sms", "sso", "passkey", "kba", "id_verification"]),
  accessCodeHash: z.string().nullable(),
  otpCodeHash: z.string().nullable(),
  otpExpiresAt: z.string().nullable(),
  otpAttempts: z.number().int(),
  failedAuthAttempts: z.number().int(),
  authLockedUntil: z.string().nullable(),
  signingTokenHash: z.string().nullable(),
  tokenExpiresAt: z.string().nullable(),
  tokenRevokedAt: z.string().nullable(),
  consentAcceptedAt: z.string().nullable(),
  consentIp: z.string().nullable(),
  consentUserAgent: z.string().nullable(),
  consentDisclosureVersion: z.string().nullable(),
  delegatedToRecipientId: z.number().int().nullable(),
  viewedAt: z.string().nullable(),
  authenticatedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  declinedAt: z.string().nullable(),
  declinedReason: z.string().nullable(),
  bouncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const signFieldRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  envelopeId: z.number().int(),
  documentId: z.number().int(),
  recipientId: z.number().int(),
  fieldType: z.enum(["signature", "initials", "date_signed", "text", "multiline", "email", "name", "company", "title", "checkbox", "radio", "dropdown", "attachment", "stamp", "strikethrough", "readonly_merge"]),
  label: z.string().nullable(),
  pageNumber: z.number().int(),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  required: z.boolean(),
  readonly: z.boolean(),
  orderIndex: z.number().int(),
  groupId: z.string().nullable(),
  defaultValue: z.string().nullable(),
  optionsJson: z.array(z.string()).nullable(),
  validationType: z.string().nullable(),
  validationRulesJson: z.record(z.string(), z.unknown()).nullable(),
  conditionalRulesJson: z.record(z.string(), z.unknown()).nullable(),
  valueJson: z.record(z.string(), z.unknown()).nullable(),
  attachmentFileKey: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signEnvelopeFullContract = z.object({
  envelope: signEnvelopeRowContract,
  documents: z.array(signDocumentRowContract),
  recipients: z.array(signRecipientRowContract),
  fields: z.array(signFieldRowContract),
});

export const signEnvelopeValidateContract = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
});

export const signEnvelopeResendContract = z.object({ resentCount: z.number().int() });
export const signEnvelopeReminderContract = z.object({ remindedCount: z.number().int() });

export const signDocumentUploadContract = signDocumentRowContract;
export const signDocumentListContract = z.array(signDocumentRowContract);
export const signDocumentPreviewContract = z.object({
  document: signDocumentRowContract,
  url: z.string(),
  expiresInSeconds: z.number().int(),
});

export const signRecipientMutationContract = signRecipientRowContract;
export const signRecipientListContract = z.array(signRecipientRowContract);

export const signFieldMutationContract = signFieldRowContract;
export const signFieldListContract = z.array(signFieldRowContract);

const signTemplateRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  ownerMembershipId: z.number().int().nullable(),
  version: z.number().int(),
  templateJson: z.record(z.string(), z.unknown()),
  restrictedToRoles: z.array(z.string()),
  restrictedToTeams: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signTemplateMutationContract = signTemplateRowContract;
export const signTemplateListContract = z.array(signTemplateRowContract);
export const signTemplateInstantiateContract = signEnvelopeRowContract;

const signBulkSendJobRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  templateId: z.number().int(),
  senderMembershipId: z.number().int().nullable(),
  status: z.enum(["pending", "validating", "running", "completed", "failed", "cancelled"]),
  columnMappingJson: z.record(z.string(), z.string()),
  totalCount: z.number().int(),
  successCount: z.number().int(),
  failedCount: z.number().int(),
  csvFileKey: z.string().nullable(),
  errorReportFileKey: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const signBulkJobCreateContract = z.object({
  job: signBulkSendJobRowContract,
  dryRun: z.boolean(),
  preview: z.unknown().optional(),
});

export const signBulkJobListContract = z.array(signBulkSendJobRowContract);
export const signBulkJobCancelContract = signBulkSendJobRowContract;

const signSettingsContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  defaultExpirationDays: z.number().int(),
  expirationWarningDays: z.number().int(),
  defaultReminderFirstAfterDays: z.number().int(),
  defaultReminderRepeatDays: z.number().int(),
  defaultReminderMaxCount: z.number().int(),
  allowedFileTypes: z.array(z.string()),
  maxFileSizeMb: z.number().int(),
  allowedAuthMethods: z.array(z.string()),
  certificateFormat: z.string(),
  retentionPolicyJson: z.record(z.string(), z.unknown()),
  publicFormsEnabled: z.boolean(),
  bulkSendMaxRowsPerJob: z.number().int(),
  bulkSendMaxActiveJobs: z.number().int(),
  bulkSendMaxRecipientsPerEnvelope: z.number().int(),
  senderRateLimitPerHour: z.number().int(),
  brandingJson: z.record(z.string(), z.unknown()).nullable(),
  webhookUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signSettingsSingleContract = signSettingsContract;

const signWatermarkPolicyRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  scopeType: z.string(),
  scopeId: z.number().int().nullable(),
  text: z.string().nullable(),
  imageFileKey: z.string().nullable(),
  opacity: z.number().int(),
  angle: z.number().int(),
  color: z.string(),
  fontSize: z.number().int(),
  placement: z.string(),
  showOnFinalPdf: z.boolean(),
  previewOnly: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signWatermarkPolicyListContract = z.array(signWatermarkPolicyRowContract);
export const signWatermarkPolicyMutationContract = signWatermarkPolicyRowContract;

export const signAiSummarizeContract = z.object({ summary: z.string() });

const signAuditEventFullContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  envelopeId: z.number().int().nullable(),
  recipientId: z.number().int().nullable(),
  actorType: z.string(),
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  eventType: z.string(),
  eventMessage: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  geolocationJson: z.record(z.string(), z.unknown()).nullable(),
  documentHash: z.string().nullable(),
  requestId: z.string().nullable(),
  eventPayloadJson: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});

export const signAuditEventsListContract = z.array(signAuditEventFullContract);

export const signDashboardContract = z.object({
  awaitingMe: z.number().int(),
  sentPending: z.number().int(),
  completedThisMonth: z.number().int(),
  expiringSoon: z.number().int(),
  failedOrBounced: z.number().int(),
  recentActivity: z.array(
    z.object({
      id: z.number().int(),
      envelopeId: z.number().int().nullable(),
      recipientId: z.number().int().nullable(),
      actorType: z.string(),
      actorName: z.string().nullable(),
      actorEmail: z.string().nullable(),
      eventType: z.string(),
      eventMessage: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export const signSummaryContract = z.object({
  byStatus: z.record(z.string(), z.number().int()),
  avgTimeToSignHours: z.number().nullable(),
  completionRate: z.number(),
  declineRate: z.number(),
  expiringSoonCount: z.number().int(),
  senderPerformance: z.array(
    z.object({
      senderMembershipId: z.number().int().nullable(),
      senderName: z.string().nullable(),
      sentCount: z.number().int(),
    }),
  ),
  templateUsage: z.array(
    z.object({
      templateId: z.number().int().nullable(),
      templateName: z.string(),
      value: z.number().int(),
    }),
  ),
  bulkSendStats: z
    .object({
      totalJobs: z.number().int(),
      totalRows: z.number(),
      successRows: z.number(),
      failedRows: z.number(),
    })
    .nullable(),
  authFailures: z.number().int(),
  watermarkUsageCount: z.number().int(),
});

export const signFinalPdfUrlContract = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int(),
  hash: z.string().nullable(),
});

export const signPublicDocumentPreviewContract = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int(),
});

export const signSuccessContract = z.object({ success: z.literal(true) });

export const signDocumentUrlContract = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int(),
});

/**
 * `getSessionResponseSchema` — a discriminated union on `state`. The non-active
 * branch is declared `z.string().refine(s => s !== "active")`; the ten members
 * below are `SessionState` in `sign-public.service.ts`, which `deriveState` is
 * the only producer of. `authMethod` is the `sign_auth_method` pgEnum.
 */
export const signPublicSessionContract = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("active"),
    envelope: z.object({
      id: z.number().int(),
      title: z.string(),
      subject: z.string().nullable(),
      message: z.string().nullable(),
      expiresAt: z.string().nullable(),
    }),
    sender: z.object({ name: z.string() }),
    recipient: z.object({
      id: z.number().int(),
      name: z.string(),
      email: z.string().nullable(),
      authMethod: z.enum([
        "email_link",
        "access_code",
        "otp_email",
        "otp_sms",
        "sso",
        "passkey",
        "kba",
        "id_verification",
      ]),
      authenticated: z.boolean(),
      consentAccepted: z.boolean(),
    }),
    documents: z.array(
      z.object({
        id: z.number().int(),
        fileName: z.string(),
        pageCount: z.number().int().nullable(),
      }),
    ),
    fields: z.array(signFieldRowContract),
  }),
  z.object({
    state: z.enum([
      "not_your_turn",
      "expired",
      "revoked",
      "recipient_completed",
      "recipient_declined",
      "envelope_voided",
      "envelope_expired",
      "envelope_declined",
      "envelope_completed",
    ]),
    envelopeTitle: z.string(),
    recipientName: z.string(),
  }),
]);
