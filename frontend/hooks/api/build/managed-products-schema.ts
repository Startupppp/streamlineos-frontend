import { z } from "zod";

export const managedProductRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  ownerId: z.string().nullable(),
  pmWorkspaceId: z.string().nullable(),
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
});

export type ManagedProductInsights = z.infer<typeof managedProductInsightsContract>;
