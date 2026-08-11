import { z } from "zod";

export const entrySchema = z.object({
  productId: z.string().min(1, "Product required"),
  unitPriceCents: z.string().min(1, "Price required"),
  minQuantity: z.string(),
});

export type EntryFormValues = z.infer<typeof entrySchema>;
