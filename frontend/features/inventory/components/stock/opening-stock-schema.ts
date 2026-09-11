import { z } from "zod";

export const lineSchema = z.object({
  variantId: z.string().min(1, "Select a product variant."),
  warehouseId: z.string().min(1, "Select a warehouse."),
  locationId: z.string().min(1, "Select a location."),
  qty: z
    .string()
    .min(1, "Quantity must be greater than 0.")
    .refine((v) => {
      const n = Number(v);
      return !isNaN(n) && n > 0;
    }, "Quantity must be greater than 0."),
  unitCost: z
    .string()
    .refine((v) => {
      if (v === "" || v === undefined) return true;
      const n = Number(v);
      return !isNaN(n) && n >= 0;
    }, "Unit cost must be 0 or greater."),
});

export const formSchema = z
  .object({
    lines: z
      .array(lineSchema)
      .min(1, "Add at least one stock line.")
      .superRefine((lines, ctx) => {
        const seen = new Set<string>();
        lines.forEach((l, i) => {
          const key = `${l.variantId}:${l.locationId}`;
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Duplicate variant/location combination.",
              path: [i, "variantId"],
            });
          } else {
            seen.add(key);
          }
        });
      }),
    notes: z.string().max(500).optional(),
  });

export type FormValues = z.infer<typeof formSchema>;

export function defaultLine() {
  return { variantId: "", warehouseId: "", locationId: "", qty: "", unitCost: "" };
}
