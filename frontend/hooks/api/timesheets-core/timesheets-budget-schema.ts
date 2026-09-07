import { z } from "zod";

const burnResultContract = z.object({
  budget: z.number(),
  consumed: z.number(),
  percentUsed: z.number(),
  remaining: z.number(),
  alertLevel: z.number(),
  over: z.boolean(),
});

export const budgetItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number().nullable(),
  projectName: z.string().nullable(),
  clientId: z.number().nullable(),
  budgetType: z.enum(["HOURS", "AMOUNT"]),
  budgetHours: z.string().nullable(),
  budgetAmount: z.string().nullable(),
  currency: z.string(),
  alertThresholds: z.array(z.number()),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  burn: burnResultContract,
});

export const budgetListResponseContract = z.array(budgetItemContract);
