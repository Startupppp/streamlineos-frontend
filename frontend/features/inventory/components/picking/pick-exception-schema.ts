import { z } from "zod";

/**
 * B5's vocabulary, as the pick row can raise it today.
 *
 * `SUBSTITUTED` needs a second product and a quantity, and the other three do
 * not — "the shelf was empty" has no replacement to record. The pair is checked
 * here rather than in the submit handler so the impossible combination cannot be
 * built in the first place.
 */
export const pickExceptionSchema = z
  .object({
    reason: z.enum(["SHORT", "NOT_FOUND", "DAMAGED", "SUBSTITUTED"]),
    notes: z.string().max(500).optional(),
    substituteVariantId: z.string().optional(),
    quantityPicked: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, "Use a number with up to 4 decimal places")
      .optional(),
  })
  .refine(
    (value) =>
      value.reason !== "SUBSTITUTED" ||
      (!!value.substituteVariantId && !!value.quantityPicked),
    {
      message: "A substitution has to name the product and the quantity that went in the tote",
      path: ["substituteVariantId"],
    },
  );

export type PickExceptionFormValues = z.infer<typeof pickExceptionSchema>;
