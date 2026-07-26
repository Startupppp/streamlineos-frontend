import { z } from "zod";

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
export const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;
export const CONTAINS_ALPHANUMERIC = /[A-Za-z0-9]/;

export const NAME_MAX = 100;
export const SKU_MIN = 2;
export const SKU_MAX = 50;
export const DESCRIPTION_MAX = 2000;

export const productNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(1, "Product name is required.")
      .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`)
      .refine(
        (v) => CONTAINS_ALPHANUMERIC.test(v),
        "Name must contain at least one letter or number.",
      ),
  );

export const productSkuSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(SKU_MIN, `SKU must be at least ${SKU_MIN} characters`)
      .max(SKU_MAX, `SKU must be ${SKU_MAX} characters or fewer`)
      .regex(
        SKU_PATTERN,
        "SKU may only contain uppercase letters, digits, hyphens, or underscores",
      ),
  );

export const productSkuOptionalSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .min(SKU_MIN, `SKU must be at least ${SKU_MIN} characters`)
        .max(SKU_MAX, `SKU must be ${SKU_MAX} characters or fewer`)
        .regex(
          SKU_PATTERN,
          "SKU may only contain uppercase letters, digits, hyphens, or underscores",
        ),
    ]),
  );

export const productDescriptionSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .max(
        DESCRIPTION_MAX,
        `Description must be ${DESCRIPTION_MAX} characters or fewer`,
      ),
  )
  .optional();

export const productSchema = z.object({
  name: productNameSchema,
  sku: productSkuOptionalSchema,
  description: productDescriptionSchema,
  categoryId: z.string().optional(),
  isActive: z.string().optional(),
  productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]),
  trackingMethod: z.enum(["NONE", "LOT", "SERIAL"]),
  costingMethod: z.enum(["STANDARD", "WEIGHTED_AVERAGE", "FIFO"]),
  standardCost: z
    .string()
    .optional()
    .refine(
      (v) => !v || DECIMAL_PATTERN.test(v),
      "Enter a number with up to 4 decimal places",
    ),
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
  uomId: z.string().optional(),
  purchaseUomId: z.string().optional(),
  salesUomId: z.string().optional(),
  barcode: z
    .string()
    .max(100, "Barcode must be 100 characters or fewer")
    .optional(),
  reorderEnabled: z.boolean(),
  reorderPoint: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
});

export type ProductFormValues = z.infer<typeof productSchema>;
