import { z } from "zod";

export const storageUploadContract = z.object({
  quarantineId: z.string(),
  status: z.literal("pending_scan"),
  key: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string(),
});

export const onboardingDocumentRowContract = z.object({
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
  status: z.string(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  remarks: z.string().nullable(),
  rowVersion: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StorageUploadResponse = z.infer<typeof storageUploadContract>;
export type OnboardingDocumentRow = z.infer<typeof onboardingDocumentRowContract>;
