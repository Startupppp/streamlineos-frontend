import { z } from "zod";

/** Form side of `createOfferFulfillmentSchema` / `updateOfferFulfillmentSchema`; strings until submit. */
export const fulfillmentMappingSchema = z.object({
  invSkuId: z.string().min(1, "Choose the inventory variant to ship"),
  quantityPerUnit: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0 && Number(v) <= 999_999, "Enter a quantity above 0 and up to 999,999"),
  uom: z.string().trim().max(32, "Keep the unit to 32 characters"),
  notes: z.string().max(2000, "Keep notes to 2,000 characters"),
});

export type FulfillmentMappingValues = z.infer<typeof fulfillmentMappingSchema>;
