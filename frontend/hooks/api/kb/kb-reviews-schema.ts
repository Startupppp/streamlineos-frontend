import { z } from "zod";

const kbPageReviewWithContextContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  type: z.enum(["approval", "freshness"]),
  status: z.enum(["pending", "approved", "rejected"]),
  isOverdue: z.boolean(),
  requestedById: z.string().nullable(),
  reviewerId: z.string().nullable(),
  requestedByMembershipId: z.number().int().nullable(),
  reviewerMembershipId: z.number().int().nullable(),
  dueAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pageTitle: z.string().nullable(),
  pageTrustState: z
    .enum(["unverified", "verified", "verification_expired"])
    .nullable(),
  requestedByName: z.string().nullable(),
  reviewerName: z.string().nullable(),
});

export const kbPageReviewListContract = z.object({
  data: z.array(kbPageReviewWithContextContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbPageReviewContract = kbPageReviewWithContextContract;
export const kbPageReviewSuccessContract = z.object({ success: z.boolean() });

export const kbPageReviewBulkDecideContract = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      outcome: z.enum(["succeeded", "denied", "conflict", "notFound"]),
    }),
  ),
});
