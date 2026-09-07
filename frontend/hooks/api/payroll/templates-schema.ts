import { z } from "zod";

export const payrollTemplateContract = z.object({
  id: z.number(),
  orgId: z.string().nullable(),
  key: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  bestFor: z.string().nullable(),
  complexity: z.enum(["SIMPLE", "MODERATE", "ADVANCED"]).nullable(),
  badge: z.string().nullable(),
  category: z.string(),
  defaultToggles: z.record(z.string(), z.unknown()),
  defaultComponents: z.array(z.object({ code: z.string(), name: z.string(), calcMethod: z.string().optional() })),
  isSystem: z.boolean(),
  isRecommended: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const templateListResponseContract = z.object({
  items: z.array(payrollTemplateContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type PayrollTemplate = z.infer<typeof payrollTemplateContract>;
