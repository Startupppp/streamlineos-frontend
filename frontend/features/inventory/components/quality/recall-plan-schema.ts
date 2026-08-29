import { z } from "zod";
import type { RecallSelection } from "@/hooks/api/inventory/quality";

/**
 * D4 — the form behind the recall planner.
 *
 * Not a mirror of the API's selection shape, deliberately. The API takes a
 * conjunction of optional criteria; the form makes the operator pick *how*
 * they are identifying the goods first, because "recall by lot" and "recall by
 * vendor" are different acts with different blast radii, and a screen that
 * offers all the fields at once invites somebody to fill in two and get an
 * intersection they did not intend.
 *
 * The date window applies to every mode: "everything this vendor sent us"
 * almost always means "…in that window", and it is the single most effective
 * way to keep a recall from swallowing the catalogue.
 */
export const RECALL_MODES = ["lots", "product", "vendor"] as const;
export type RecallMode = (typeof RECALL_MODES)[number];

/** Narrows a Select's `string` back to a mode without forcing the type. */
export function asRecallMode(value: string): RecallMode {
  return RECALL_MODES.find((m) => m === value) ?? "lots";
}

export const recallPlanSchema = z
  .object({
    // No `.default()` here, deliberately. A default makes the field optional on
    // the schema's *input* type and required on its *output*, and `zodResolver`
    // types the form from the input while `useForm<T>` types it from the output
    // — so the two stop matching and every handler needs a cast. The sheet
    // supplies all six values in `defaultValues`, which is where a form's
    // defaults belong; nothing in this repo diverges the two types.
    mode: z.enum(RECALL_MODES),
    lotIds: z.array(z.number().int().positive()),
    productVariantId: z.string(),
    vendorId: z.string(),
    manufacturedFrom: z.string(),
    manufacturedTo: z.string(),
  })
  .refine((v) => v.mode !== "lots" || v.lotIds.length > 0, {
    message: "Pick at least one lot",
    path: ["lotIds"],
  })
  .refine((v) => v.mode !== "product" || v.productVariantId !== "", {
    message: "Pick a product",
    path: ["productVariantId"],
  })
  .refine((v) => v.mode !== "vendor" || v.vendorId !== "", {
    message: "Pick a supplier",
    path: ["vendorId"],
  })
  .refine(
    (v) =>
      v.manufacturedFrom === "" ||
      v.manufacturedTo === "" ||
      v.manufacturedFrom <= v.manufacturedTo,
    { message: "The window ends before it starts", path: ["manufacturedTo"] },
  );

export type RecallPlanFormValues = z.infer<typeof recallPlanSchema>;

export const recallDetailsSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().default(""),
});

export type RecallDetailsFormValues = z.infer<typeof recallDetailsSchema>;

/** The form's answer, in the shape the simulate and execute endpoints take. */
export function toSelection(values: RecallPlanFormValues): RecallSelection {
  const window = {
    ...(values.manufacturedFrom ? { manufacturedFrom: values.manufacturedFrom } : {}),
    ...(values.manufacturedTo ? { manufacturedTo: values.manufacturedTo } : {}),
  };

  if (values.mode === "lots") return { lotIds: values.lotIds, ...window };
  if (values.mode === "product")
    return { productVariantIds: [Number(values.productVariantId)], ...window };
  return { vendorId: Number(values.vendorId), ...window };
}
