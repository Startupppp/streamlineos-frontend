import { z } from "zod";

export const assetFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Asset name is required")
    .max(100, "Asset name is too long")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Must contain a letter or number"),
  type: z.string().min(1, "Type is required"),
  brand: z
    .string()
    .trim()
    .min(1, "Brand is required")
    .max(100, "Brand is too long"),
  model: z.string().trim().min(1, "Model is required").max(100, "Model is too long"),
  serialNumber: z
    .string()
    .trim()
    .min(1, "Serial number is required")
    .max(100, "Serial number is too long"),
  purchaseDate: z.string().optional(),
  purchaseCost: z
    .number()
    .min(0, "Cost cannot be negative")
    .max(9_999_999, "Cost exceeds maximum")
    .multipleOf(0.01, "Maximum 2 decimal places")
    .optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;
