import { z } from "zod";

const kbSourceListItemContract = z.object({
  id: z.number().int(),
  kind: z.string(),
  title: z.string(),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  fileUrl: z.string().nullable(),
  status: z.string(),
  chunkCount: z.number().int(),
  errorMessage: z.string().nullable(),
  spaceId: z.number().int().nullable(),
  createdAt: z.string(),
});

export const kbSourcePageContract = z.object({
  data: z.array(kbSourceListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbSourceContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  spaceId: z.number().int().nullable(),
  kind: z.string(),
  title: z.string(),
  fileKey: z.string().nullable(),
  fileUrl: z.string().nullable(),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  noteText: z.string().nullable(),
  status: z.string(),
  chunkCount: z.number().int(),
  errorMessage: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const kbSourceSuccessContract = z.object({ success: z.boolean() });
