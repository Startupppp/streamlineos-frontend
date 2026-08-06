import { z } from "zod";
import {
  productNameSchema,
  productSkuSchema,
  productDescriptionSchema,
} from "@/features/inventory/lib/new-product-schema";

const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;

export const productEditSchema = z.object({
  name: productNameSchema,
  sku: productSkuSchema,
  description: productDescriptionSchema,
  categoryId: z.string().optional(),
  uomId: z.string().optional(),
  purchaseUomId: z.string().optional(),
  salesUomId: z.string().optional(),
  costPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
  sellingPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
  reorderPoint: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
  standardCost: z
    .string()
    .optional()
    .refine(
      (v) => !v || DECIMAL_PATTERN.test(v),
      "Enter a number with up to 4 decimal places",
    ),
  isActive: z.string(),
  productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]).optional(),
  trackingMethod: z.enum(["NONE", "LOT", "SERIAL"]).optional(),
  costingMethod: z.enum(["STANDARD", "WEIGHTED_AVERAGE", "FIFO"]).optional(),
  reorderEnabled: z.boolean().optional(),
  barcode: z.string().max(100, "Barcode must be 100 characters or fewer").optional(),
});

export type EditFormValues = z.infer<typeof productEditSchema>;
