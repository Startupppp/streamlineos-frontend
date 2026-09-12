export type SignEnvelopeStatus =
  | "draft"
  | "ready_to_send"
  | "sent"
  | "delivered"
  | "partially_completed"
  | "completed"
  | "declined"
  | "voided"
  | "expired"
  | "correction_required"
  | "failed";

export type SignRecipientStatus =
  | "pending"
  | "invited"
  | "viewed"
  | "authenticated"
  | "signing"
  | "completed"
  | "declined"
  | "delegated"
  | "bounced"
  | "expired";

export type SignRecipientType = "signer" | "approver" | "cc" | "viewer" | "in_person_host" | "internal_reviewer";

export type SignAuthMethod =
  | "email_link"
  | "access_code"
  | "otp_email"
  | "otp_sms"
  | "sso"
  | "passkey"
  | "kba"
  | "id_verification";

export type SignFieldType =
  | "signature"
  | "initials"
  | "date_signed"
  | "text"
  | "multiline"
  | "email"
  | "name"
  | "company"
  | "title"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "attachment"
  | "stamp"
  | "strikethrough"
  | "readonly_merge";

export type SignRoutingMode = "parallel" | "sequential" | "mixed";
export type SignCcTiming = "on_send" | "on_complete";
export type SignTemplateStatus = "draft" | "published" | "archived";

export interface SignEnvelope {
  id: number;
  orgId: string;
  title: string;
  subject: string | null;
  message: string | null;
  status: SignEnvelopeStatus;
  routingMode: SignRoutingMode;
  ccTiming: SignCcTiming;
  allowDecline: boolean;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  templateId: number | null;
  watermarkPolicyId: number | null;
  senderMembershipId: number | null;
  reminderEnabled: boolean;
  reminderFirstAfterDays: number;
  reminderRepeatDays: number;
  reminderMaxCount: number;
  reminderSentCount: number;
  lastReminderAt: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  voidedAt: string | null;
  voidedByMembershipId: number | null;
  voidReason: string | null;
  declinedAt: string | null;
  correctionRequiredAt: string | null;
  correctionReason: string | null;
  finalizationKey: string | null;
  finalizedAt: string | null;
  finalPdfFileKey: string | null;
  finalPdfHash: string | null;
  publicFormId: number | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SignDocument {
  id: number;
  orgId: string;
  envelopeId: number;
  originalFileKey: string;
  currentFileKey: string;
  fileName: string;
  mimeType: string;
  pageCount: number | null;
  fileSize: number;
  sha256Hash: string;
  conversionStatus: "pending" | "converted" | "failed" | "not_needed";
  conversionError: string | null;
  orderIndex: number;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignRecipient {
  id: number;
  orgId: string;
  envelopeId: number;
  roleName: string;
  recipientType: SignRecipientType;
  name: string;
  email: string | null;
  phone: string | null;
  userMembershipId: number | null;
  routingOrder: number;
  status: SignRecipientStatus;
  authMethod: SignAuthMethod;
  otpExpiresAt: string | null;
  otpAttempts: number;
  failedAuthAttempts: number;
  authLockedUntil: string | null;
  tokenExpiresAt: string | null;
  tokenRevokedAt: string | null;
  consentAcceptedAt: string | null;
  consentIp: string | null;
  consentUserAgent: string | null;
  consentDisclosureVersion: string | null;
  delegatedToRecipientId: number | null;
  viewedAt: string | null;
  authenticatedAt: string | null;
  completedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
  bouncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignField {
  id: number;
  orgId: string;
  envelopeId: number;
  documentId: number;
  recipientId: number;
  fieldType: SignFieldType;
  label: string | null;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  readonly: boolean;
  orderIndex: number;
  groupId: string | null;
  defaultValue: string | null;
  optionsJson: string[] | null;
  validationType: string | null;
  validationRulesJson: Record<string, unknown> | null;
  conditionalRulesJson: Record<string, unknown> | null;
  valueJson: Record<string, unknown> | null;
  attachmentFileKey: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignEnvelopeFull {
  envelope: SignEnvelope;
  documents: SignDocument[];
  recipients: SignRecipient[];
  fields: SignField[];
}

export interface SignTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: SignTemplateStatus;
  version: number;
  templateJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SignBulkSendJob {
  id: number;
  orgId: string;
  templateId: number;
  senderMembershipId: number | null;
  status: "pending" | "validating" | "running" | "completed" | "failed" | "cancelled";
  columnMappingJson: Record<string, string>;
  totalCount: number;
  successCount: number;
  failedCount: number;
  csvFileKey: string | null;
  errorReportFileKey: string | null;
  createdAt: string;
  completedAt: string | null;
}

export type SignBulkSendRowStatus = "pending" | "success" | "failed";

export interface SignBulkSendRow {
  id: number;
  jobId: number;
  rowNumber: number;
  rawDataJson: Record<string, unknown>;
  status: SignBulkSendRowStatus;
  envelopeId: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignBulkSendJobDetail {
  job: SignBulkSendJob;
  /** The first page of the job's rows, by row number — not all of them. */
  rows: SignBulkSendRow[];
  /** How many rows the job has, counted server-side. */
  rowTotal: number;
  rowsTruncated: boolean;
}

/**
 * `GET /sign/bulk-send/jobs/:id/error-report`: the failed rows, filtered in SQL
 * and capped at `limit`, beside the job's own failure tally so a capped list
 * cannot understate how many rows failed.
 */
export interface SignBulkSendErrorReport {
  rows: SignBulkSendRow[];
  failedCount: number;
  returned: number;
  limit: number;
  truncated: boolean;
}

/**
 * The stored row. `certificateJson` is jsonb on the backend and typed there as
 * `Record<string, unknown>`, so it stays unknown here too — the sheet narrows it
 * through a Zod schema rather than asserting a shape it cannot prove.
 */
export interface SignCertificate {
  id: number;
  orgId: string;
  envelopeId: number;
  certificateNumber: string;
  certificateFileKey: string;
  finalPdfFileKey: string;
  finalPdfHash: string;
  watermarked: boolean;
  generatedAt: string;
  certificateJson: Record<string, unknown>;
}

export interface SignCertificateResponse {
  url: string;
  expiresInSeconds: number;
  certificate: SignCertificate;
}

export interface SignAuditEvent {
  id: number;
  orgId: string;
  envelopeId: number | null;
  recipientId: number | null;
  actorType: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  eventType: string;
  eventMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  geolocationJson: Record<string, unknown> | null;
  documentHash: string | null;
  requestId: string | null;
  eventPayloadJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface SignWatermarkPolicy {
  id: number;
  orgId: string;
  scopeType: string;
  scopeId: number | null;
  text: string | null;
  imageFileKey: string | null;
  opacity: number;
  angle: number;
  color: string;
  fontSize: number;
  placement: string;
  showOnFinalPdf: boolean;
  previewOnly: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignOrgSettings {
  id: number;
  orgId: string;
  defaultExpirationDays: number;
  expirationWarningDays: number;
  defaultReminderFirstAfterDays: number;
  defaultReminderRepeatDays: number;
  defaultReminderMaxCount: number;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  allowedAuthMethods: string[];
  certificateFormat: string;
  retentionPolicyJson: Record<string, unknown>;
  bulkSendMaxRowsPerJob: number;
  bulkSendMaxActiveJobs: number;
  bulkSendMaxRecipientsPerEnvelope: number;
  senderRateLimitPerHour: number;
  brandingJson: Record<string, unknown> | null;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SignPublicSessionState =
  | "active"
  | "not_your_turn"
  | "expired"
  | "revoked"
  | "recipient_completed"
  | "recipient_declined"
  | "envelope_voided"
  | "envelope_expired"
  | "envelope_declined"
  | "envelope_completed";

export interface SignPublicSession {
  state: SignPublicSessionState;
  envelopeTitle?: string;
  recipientName?: string;
  envelope?: { id: number; title: string; subject: string | null; message: string | null; expiresAt: string | null };
  sender?: { name: string };
  recipient?: {
    id: number;
    name: string;
    email: string | null;
    authMethod: SignAuthMethod;
    authenticated: boolean;
    consentAccepted: boolean;
  };
  documents?: { id: number; fileName: string; pageCount: number | null }[];
  fields?: SignField[];
}

export type SignSweepName = "reminder" | "expiration";

export type SignSweepStaleness = "ok" | "never_run" | "stale" | "errored";

export interface SignSweepRunSummary {
  sweep: SignSweepName;
  ranAt: string | null;
  affected: number;
  error: string | null;
  neverRun: boolean;
  staleness: SignSweepStaleness;
  healthy: boolean;
  expectedWithinHours: number;
}
