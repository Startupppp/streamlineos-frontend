import { z } from "zod";

const kbPageReviewWithContextContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  type: z.enum(["approval", "freshness"]),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
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
  requestedByName: z.string().nullable(),
  reviewerName: z.string().nullable(),
});

export const kbPageReviewListContract = z.array(kbPageReviewWithContextContract);
export const kbPageReviewContract = kbPageReviewWithContextContract;
export const kbPageReviewSuccessContract = z.object({ success: z.boolean() });
