import { z } from "zod";

export const candidateActivityEventSchema = z.object({
  type: z.enum(["AUDIT", "INTERVIEW", "MESSAGE", "DOCUMENT"]),
  id: z.string(),
  label: z.string(),
  detail: z.record(z.string(), z.unknown()),
  actor: z.string().nullable(),
  at: z.string(),
});

export const candidateActivityEventListSchema = z.array(candidateActivityEventSchema);

export const vaultDocumentSchema = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  orgId: z.string(),
  filename: z.string(),
  s3Key: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  documentType: z.string().nullable(),
  avResult: z.enum(["PENDING", "CLEAN", "INFECTED"]).nullable(),
  expiresAt: z.string().nullable(),
  uploadedBy: z.string(),
  createdAt: z.string(),
});

export const vaultDocumentListSchema = z.array(vaultDocumentSchema);

export const rolloutDocumentItemSchema = z.object({
  id: z.number().int(),
  templateId: z.number().int().nullable(),
  templateTitle: z.string().nullable(),
  title: z.string(),
  status: z.string(),
  sentAt: z.string().nullable(),
  viewedAt: z.string().nullable(),
  signedAt: z.string().nullable(),
  declinedAt: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string(),
});

export const rolloutDocumentListSchema = z.array(rolloutDocumentItemSchema);

const candidateDocumentSchema = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  orgId: z.string(),
  templateId: z.number().int().nullable(),
  title: z.string(),
  htmlContent: z.string(),
  status: z.string(),
  externalDocId: z.string().nullable(),
  sentAt: z.string().nullable(),
  viewedAt: z.string().nullable(),
  signedAt: z.string().nullable(),
  declinedAt: z.string().nullable(),
  acceptanceDeadline: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const generateRolloutResponseSchema = z.object({
  documents: z.array(candidateDocumentSchema),
  count: z.number().int(),
});

export const bgvUpdateSuccessSchema = z.object({ success: z.literal(true) });

export const vaultAccessLogItemSchema = z.object({
  id: z.number().int(),
  action: z.string(),
  accessedAt: z.string(),
  fileName: z.string(),
  documentType: z.string().nullable(),
  accessorName: z.string().nullable(),
  accessorFirstName: z.string().nullable(),
  accessorLastName: z.string().nullable(),
  accessorDisplayName: z.string(),
});

export const vaultAccessLogListSchema = z.array(vaultAccessLogItemSchema);

export const bgvComplianceItemSchema = z.object({
  jobPostingId: z.number().int(),
  jobTitle: z.string(),
  total: z.number().int(),
  cleared: z.number().int(),
  failed: z.number().int(),
  pending: z.number().int(),
  initiated: z.number().int(),
  notInitiated: z.number().int(),
  clearedPct: z.number().int(),
});

export const bgvComplianceListSchema = z.array(bgvComplianceItemSchema);

export const candidateReferralSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  referredBy: z.string(),
  referredByMembershipId: z.number().int().nullable(),
  jobPostingId: z.number().int().nullable(),
  relationship: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  bonusEligible: z.boolean(),
  bonusAmount: z.string().nullable(),
  bonusPaidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const candidateReferralListSchema = z.array(candidateReferralSchema);

export const calibrationSessionSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  scheduledAt: z.string().nullable(),
  status: z.enum(["pending", "scheduled", "completed", "cancelled"]),
  notes: z.string().nullable(),
  decision: z.enum(["STRONG_HIRE", "HIRE", "NO_HIRE", "HOLD"]).nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  participantIds: z.array(z.string()),
});

export const calibrationSessionListSchema = z.array(calibrationSessionSchema);

export const referenceCheckSchema = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  orgId: z.string(),
  referenceName: z.string(),
  referenceDesignation: z.string().nullable(),
  referenceCompany: z.string().nullable(),
  referenceEmail: z.string().nullable(),
  referencePhone: z.string().nullable(),
  relationship: z.string().nullable(),
  status: z.string(),
  outcome: z.string().nullable(),
  notes: z.string().nullable(),
  contactedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const referenceCheckListSchema = z.array(referenceCheckSchema);

export const referenceCheckSuccessSchema = z.object({ success: z.literal(true) });
