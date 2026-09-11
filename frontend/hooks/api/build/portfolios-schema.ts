import { z } from "zod";

const portfolioRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.string(),
  health: z.string().nullable(),
  strategicGoal: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export { portfolioRowContract };

const portfolioListItemContract = portfolioRowContract.extend({
  projectCount: z.number().int(),
});

export const portfolioPageContract = z.object({
  data: z.array(portfolioListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const portfolioDetailContract = portfolioRowContract.extend({
  projects: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    key: z.string(),
    status: z.string(),
    openCount: z.number().int(),
    doneCount: z.number().int(),
  })),
  programs: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    status: z.string(),
  })),
});

export const programRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  portfolioId: z.number().int().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.string(),
  health: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const programListContract = z.array(programRowContract);

export const portfoliosSuccessContract = z.object({ success: z.literal(true) });
