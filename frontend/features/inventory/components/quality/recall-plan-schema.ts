import { z } from "zod";
import type { RecallSelection } from "@/hooks/api/inventory/quality";

export const RECALL_MODES = ["lots", "product", "vendor"] as const;
export type RecallMode = (typeof RECALL_MODES)[number];

export function asRecallMode(value: string): RecallMode {
  return RECALL_MODES.find((m) => m === value) ?? "lots";
}

export const recallPlanSchema = z
  .object({
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
