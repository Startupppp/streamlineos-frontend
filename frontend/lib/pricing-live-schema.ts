import { z } from "zod";

export const publicPlanPriceContract = z.object({
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]),
  monthlyMinor: z.number(),
  annualMinor: z.number(),
  seatLimit: z.number().nullable(),
});

export const publicPricingContract = z.object({
  currency: z.string(),
  isRequestedCurrency: z.boolean(),
  annualDiscountPct: z.number(),
  trialDays: z.number(),
  plans: z.array(publicPlanPriceContract),
});

export const dataResidencyContract = z.object({
  options: z.array(
    z.object({
      region: z.string(),
      description: z.string(),
      examples: z.array(z.string()).optional(),
    }),
  ),
  likely: z
    .object({
      region: z.string(),
      description: z.string(),
      isMapped: z.boolean(),
    })
    .optional(),
});
