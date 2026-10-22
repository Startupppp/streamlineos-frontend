import { z } from "zod";

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

export const resolvePickExceptionSchema = z.object({
  resolution: z.enum(["ACCEPTED", "REJECTED"]),
  notes: z.string().min(1, "Say what you decided and why").max(500),
});

export type ResolvePickExceptionFormValues = z.infer<typeof resolvePickExceptionSchema>;
