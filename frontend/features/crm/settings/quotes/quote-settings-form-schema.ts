import { z } from "zod";

export const quoteSettingsFormSchema = z.object({
  maxDiscountPercent: z.number().int().min(0).max(100).nullable().optional(),
  requirePricebookPrice: z.boolean(),
  defaultExpiryDays: z.number().int().min(1).max(365),
  allowPriceOverride: z.boolean(),
});

export type QuoteSettingsFormValues = z.infer<typeof quoteSettingsFormSchema>;
