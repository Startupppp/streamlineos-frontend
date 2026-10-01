import { z } from "zod";
import { genProjectFilesSchema } from "@/contracts/build-contracts.generated";

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

export const filePageContract = genProjectFilesSchema;

export const signedUrlContract = z.object({
  url: z.string(),
  expiresIn: z.number().int(),
});
