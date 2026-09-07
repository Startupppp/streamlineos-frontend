import { z } from "zod";

const rateCardContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  currency: z.string(),
  isDefault: z.boolean(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const rateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  rateCardId: z.number().nullable(),
  projectId: z.number().nullable(),
  userMembershipId: z.number().nullable(),
  clientId: z.number().nullable(),
  taskId: z.number().nullable(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
  billRate: z.string(),
  costRate: z.string().nullable(),
  currency: z.string(),
  priority: z.number(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ratesListResponseContract = z.object({
  rates: z.array(rateContract),
  rateCards: z.array(rateCardContract),
});
