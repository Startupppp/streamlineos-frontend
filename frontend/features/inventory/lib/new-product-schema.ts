import { z } from "zod";
import type { MaterialFamily } from "@/types/inventory";

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
  /**
   * B1 — the construction and interior-materials fields, behind the `materials`
   * pack. Every one is optional here because the pack may be off, in which case
   * the section is not rendered and the server refuses the keys outright.
   *
   * They are strings like every other field on this form: the inputs are text
   * inputs, and coercing at the schema would make an empty box a `0` rather than
   * "not answered" — which is how a lead time of nothing becomes same-day
   * delivery in the reorder report.
   */
  brand: z.string().max(120, "Brand must be 120 characters or fewer").optional(),
  materialGrade: z.string().max(60, "Grade must be 60 characters or fewer").optional(),
  finish: z.string().max(60, "Finish must be 60 characters or fewer").optional(),
  colour: z.string().max(60, "Colour must be 60 characters or fewer").optional(),
  dimensionLabel: z.string().max(80, "Dimensions must be 80 characters or fewer").optional(),
  materialFamily: z.string().optional(),
  supplierCode: z.string().max(100, "Supplier code must be 100 characters or fewer").optional(),
  packSize: z
    .string()
    .optional()
    .refine(
      (v) => !v || (DECIMAL_PATTERN.test(v) && Number(v) > 0),
      "Pack size must be more than zero — leave it empty if the item is not packed",
    ),
  leadTimeDays: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) <= 365),
      "Lead time is a whole number of days, up to 365",
    ),
  reorderQuantity: z
    .string()
    .optional()
    .refine(
      (v) => !v || (DECIMAL_PATTERN.test(v) && Number(v) > 0),
      "Reorder quantity must be more than zero — leave it empty to decide each time",
    ),
});

/**
 * B1 — the material families the catalogue splits on, and what a buyer calls
 * them. Kept beside the schema so the form, the filter and the detail page
 * cannot drift into three different spellings of the same list.
 */
export const MATERIAL_FAMILIES = [
  { value: "CEMENT_AGGREGATE", label: "Cement & aggregates" },
  { value: "STEEL_REBAR", label: "Steel & rebar" },
  { value: "BRICK_BLOCK", label: "Bricks & blocks" },
  { value: "TILE_STONE", label: "Tiles & stone" },
  { value: "PAINT_COATING", label: "Paints & coatings" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "SANITARYWARE", label: "Sanitaryware" },
  { value: "WOOD_PANEL", label: "Wood & panels" },
  { value: "GLASS_MIRROR", label: "Glass & mirrors" },
  { value: "HARDWARE_FASTENER", label: "Hardware & fasteners" },
  { value: "ADHESIVE_CHEMICAL", label: "Adhesives & chemicals" },
  { value: "FALSE_CEILING", label: "False ceiling" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "OTHER", label: "Other" },
] as const satisfies ReadonlyArray<{ value: MaterialFamily; label: string }>;

/**
 * The form field is a free string, because a `<Select>` hands back one. This is
 * what turns it back into a family the catalogue knows before it is sent, so an
 * unrecognised value is dropped rather than asserted onto the create payload.
 */
export function isMaterialFamily(value: string): value is MaterialFamily {
  return MATERIAL_FAMILIES.some((family) => family.value === value);
}

export type ProductFormValues = z.infer<typeof productSchema>;
