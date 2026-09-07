import { z } from "zod";

const documentSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string().nullable(),
  departmentId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string().nullable(),
  category: z.string().nullable(),
  hasFile: z.boolean(),
  fileName: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  version: z.number().int(),
  parentDocumentId: z.number().int().nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  expiryDate: z.string().nullable(),
  expiryReminderSent: z.boolean(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const documentListContract = z.object({
  data: z.array(documentSchema),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const documentStatsContract = z.object({
  total: z.number().int(),
  byType: z.record(z.string(), z.number().int()),
  publicCount: z.number().int(),
  storageBytes: z.number(),
  expiringIn30Days: z.number().int(),
});

const certificationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  name: z.string(),
  issuer: z.string().nullable(),
  issuedDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  fileUrl: z.string().nullable(),
  createdAt: z.string(),
  user: z.object({ id: z.string(), name: z.string().nullable() }),
});

export const documentExpiryContract = z.object({
  expiringDocuments: z.array(documentSchema),
  expiringCertifications: z.array(certificationSchema),
  totalExpiring: z.number().int(),
});

const onboardingDocListItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  employeeName: z.string().nullable(),
  documentTypeId: z.number().int(),
  documentTypeName: z.string(),
  isMandatory: z.boolean(),
  hasFile: z.boolean(),
  fileName: z.string(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  version: z.number().int(),
  status: z.enum(["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "RE_UPLOAD_REQUESTED"]),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  remarks: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewerName: z.string().nullable(),
});

export const myOnboardingDocsContract = z.object({
  data: z.array(onboardingDocListItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const onboardingDocsSummaryContract = z.object({
  data: z.array(
    z.object({
      userId: z.string(),
      userName: z.string().nullable(),
      userImage: z.string().nullable(),
      designation: z.string().nullable(),
      employeeId: z.string().nullable(),
      onboardingDocStatus: z.enum(["PENDING", "IN_PROGRESS", "APPROVED"]),
      totalRequired: z.number().int(),
      totalSubmitted: z.number().int(),
      totalApproved: z.number().int(),
      totalRejected: z.number().int(),
    }),
  ),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    total: z.number().int(),
  }),
});
