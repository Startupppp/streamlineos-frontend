import { z } from "zod";

/**
 * Mirrors `setKitBomSchema`, including the parts that are easy to miss.
 *
 * The quantity stays decimal text: the backend's `qtyString` takes up to four
 * places and refuses zero, and a number field would round 0.3333 on the way
 * through. The duplicate check is here as well as on the server because the
 * server answers a duplicate with one 400 for the whole request, and a person
 * looking at eight rows needs to be told which two collide.
 */
export const kitBomFormSchema = z
  .object({
    components: z
      .array(
        z.object({
          componentVariantId: z.string().min(1, "Choose a component"),
          quantityPer: z
            .string()
            .trim()
            .regex(/^\d{1,14}(\.\d{1,4})?$/, "A quantity with at most four decimal places")
            .refine((value) => Number(value) > 0, "More than zero"),
        }),
      )
      .max(200, "A kit takes at most 200 components"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, line] of value.components.entries()) {
      if (!line.componentVariantId) continue;
      if (seen.has(line.componentVariantId)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", index, "componentVariantId"],
          message: "This component is already on the list — change its quantity instead",
        });
      }
      seen.add(line.componentVariantId);
    }
  });

export type KitBomFormValues = z.input<typeof kitBomFormSchema>;
export type KitBomFormOutput = z.output<typeof kitBomFormSchema>;
