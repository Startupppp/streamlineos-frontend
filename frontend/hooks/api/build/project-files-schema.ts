import { z } from "zod";

export const fileRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  uploadedByMembershipId: z.number().int(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const fileCursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const filePageContract = z.object({
  data: z.array(fileRowContract),
  pagination: fileCursorPaginationContract,
});

export const signedUrlContract = z.object({
  url: z.string(),
  expiresIn: z.number().int(),
});
