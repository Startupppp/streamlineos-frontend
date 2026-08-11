import { z } from "zod";

export const CURRENCIES = ["USD", "EUR", "GBP", "INR"] as const;

export const productSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z
    .string()
    .min(1, "Price required")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      "Price must be greater than 0",
    ),
  currency: z.enum(CURRENCIES),
  taxRate: z.string(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
