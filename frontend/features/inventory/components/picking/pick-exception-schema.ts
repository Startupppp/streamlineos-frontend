import { z } from "zod";

/**
 * B5's vocabulary, as the pick row can raise it.
 *
 * Each reason carries different evidence, and the pairing is checked here rather
 * than in the submit handler so the impossible combination cannot be built in
 * the first place:
 *
 *   * `SUBSTITUTED` needs a second product and a quantity — that is what went in
 *     the tote instead, and the server rewrites the order line onto it;
 *   * `WRONG_LOCATION` wants the bin the goods were actually in, which is the
 *     whole content of the report, but does not demand one: a picker who only
 *     knows the bin was wrong still has something worth telling the warehouse,
 *     and forcing a location they cannot supply would push them onto
 *     `NOT_FOUND`, which means something else;
 *   * the plain shortfalls need nothing — "the shelf was empty" has no second
 *     item to record.
 */
export const pickExceptionSchema = z
  .object({
    reason: z.enum(["SHORT", "NOT_FOUND", "DAMAGED", "SUBSTITUTED", "WRONG_LOCATION"]),
    notes: z.string().max(500).optional(),
    foundLocationId: z.string().optional(),
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

/**
 * B5, item 4. What a reviewer decided, and why.
 *
 * The note is required rather than optional: the value of a review is that
 * somebody can later read why the order shipped the way it did, and a bare
 * "accepted" with no words answers nothing.
 */
export const resolvePickExceptionSchema = z.object({
  resolution: z.enum(["ACCEPTED", "REJECTED"]),
  notes: z.string().min(1, "Say what you decided and why").max(500),
});

export type ResolvePickExceptionFormValues = z.infer<typeof resolvePickExceptionSchema>;
