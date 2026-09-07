import { z } from "zod";

const publicationItemContract = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  workerId: z.string().nullable(),
  runEmployeeId: z.number(),
  status: z.enum(["PENDING", "PUBLISHED", "FAILED"]),
  channel: z.string().nullable().optional(),
  pdfUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  snapshotHash: z.string().nullable().optional(),
  failureReason: z.string().nullable(),
  attemptCount: z.number().optional(),
  lastAttemptAt: z.string().nullable().optional(),
});

export const publicationListContract = z.object({
  items: z.array(publicationItemContract),
  truncated: z.boolean(),
});

export const publishResponseContract = z.object({
  published: z.number(),
  total: z.number(),
  runStatus: z.string().nullable(),
});

export const retryPublishResponseContract = z.object({
  published: z.number(),
  total: z.number(),
  runStatus: z.string().nullable(),
  retried: z.number(),
});

export const retryOnePublishResponseContract = retryPublishResponseContract.extend({
  publicationId: z.number(),
});

export type PublicationList = z.infer<typeof publicationListContract>;
export type PublicationItem = z.infer<typeof publicationItemContract>;
