import { z } from "zod";

export const managedProductRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  ownerId: z.string().nullable(),
  vision: z.string().nullable(),
  missionStatement: z.string().nullable(),
  targetCustomer: z.string().nullable(),
  differentiators: z.string().nullable(),
  currentPhase: z.string().nullable(),
  targetLaunchDate: z.string().nullable(),
  successMetrics: z.unknown(),
  ownerMembershipId: z.number().int().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const managedProductPageContract = z.object({
  data: z.array(managedProductRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const managedProductInsightsContract = z.object({
  linkedProjectCount: z.number().int(),
  projectsByStatus: z.object({
    active: z.number().int(),
    completed: z.number().int(),
    archived: z.number().int(),
  }),
  submissionsByStatus: z.object({
    open: z.number().int(),
    in_progress: z.number().int(),
    resolved: z.number().int(),
    archived: z.number().int(),
  }),
  roadmapItemCount: z.number().int(),
  roadmapItemsByStatus: z.object({
    planned: z.number().int(),
    in_progress: z.number().int(),
    completed: z.number().int(),
    cancelled: z.number().int(),
  }),
  feedbackByStatus: z.object({
    open: z.number().int(),
    planned: z.number().int(),
    in_progress: z.number().int(),
    completed: z.number().int(),
    declined: z.number().int(),
  }),
  linkedFeedbackVoteCount: z.number().int(),
});

export type ManagedProductInsights = z.infer<typeof managedProductInsightsContract>;

export const managedProductBulkResultContract = z.object({
  requested: z.number().int(),
  succeeded: z.number().int(),
  skipped: z.number().int(),
  results: z.array(
    z.object({
      id: z.number().int(),
      outcome: z.enum(["updated", "skipped"]),
      reason: z.string().nullable(),
    }),
  ),
});

export type ManagedProductBulkResult = z.infer<typeof managedProductBulkResultContract>;
