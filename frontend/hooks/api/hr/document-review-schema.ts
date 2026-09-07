import { z } from "zod";

const onboardingDocListItemContract = z.object({
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

export const onboardingDocListContract = z.object({
  data: z.array(onboardingDocListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const onboardingDocRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  documentTypeId: z.number().int(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  version: z.number().int(),
  status: z.enum(["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "RE_UPLOAD_REQUESTED"]),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  remarks: z.string().nullable(),
  rowVersion: z.number().int(),
  updatedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
