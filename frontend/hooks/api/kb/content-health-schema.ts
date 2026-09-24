import { z } from "zod";

export const contentHealthSignalTypeSchema = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
]);

export type ContentHealthSignalType = z.infer<typeof contentHealthSignalTypeSchema>;

export const contentHealthSignalItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  spaceId: z.number().int().nullable(),
  status: z.string(),
  ownerMembershipId: z.number().int().nullable(),
  updatedAt: z.string(),
  nextReviewAt: z.string().nullable(),
});

export type ContentHealthSignalItem = z.infer<typeof contentHealthSignalItemSchema>;

export const contentHealthSignalsContract = z.object({
  data: z.array(contentHealthSignalItemSchema),
  hasMore: z.boolean(),
  nextCursor: z.number().int().nullable(),
});

export type ContentHealthSignalsResult = z.infer<typeof contentHealthSignalsContract>;

const contentHealthCountItemSchema = z.object({
  signalType: contentHealthSignalTypeSchema,
  count: z.number().int(),
});

export const contentHealthCountsContract = z.object({
  counts: z.array(contentHealthCountItemSchema),
});

export type ContentHealthCountsResult = z.infer<typeof contentHealthCountsContract>;
