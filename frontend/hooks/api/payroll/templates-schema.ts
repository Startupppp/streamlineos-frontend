import { z } from "zod";

export const payrollTemplateContract = z.object({
  id: z.number(),
  orgId: z.string().nullable(),
  key: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  bestFor: z.string().nullable(),
  complexity: z.string().nullable(),
  badge: z.string().nullable(),
  category: z.string(),
  defaultToggles: z.record(z.string(), z.unknown()),
  defaultComponents: z.array(z.unknown()),
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
