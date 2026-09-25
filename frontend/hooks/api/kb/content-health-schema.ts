import { z } from "zod";

export const contentHealthSignalTypeSchema = z.enum([
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
  "contradictory_claim",
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
  impact: z.number().int(),
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

export const dismissHealthItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  kind: contentHealthSignalTypeSchema,
  ruleVersion: z.number().int(),
  impact: z.number().int(),
  state: z.enum(["open", "resolved", "dismissed"]),
  assigneeMembershipId: z.number().int().nullable(),
  dueAt: z.string().nullable(),
  detectedAt: z.string(),
  resolvedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  dismissedReason: z.string().nullable(),
  dismissalExpiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DismissHealthItemResult = z.infer<typeof dismissHealthItemContract>;

export interface DismissHealthItemParams {
  pageId: number;
  kind: ContentHealthSignalType;
  ruleVersion?: number;
  reason: string;
  dismissalExpiresAt?: string;
}
