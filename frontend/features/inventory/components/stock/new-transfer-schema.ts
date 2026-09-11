import { z } from "zod";

export const NOTES_MAX = 1000;

export const newTransferSchema = z
  .object({
    fromWarehouseId: z.number({ error: "From warehouse required" }).int().positive({ message: "From warehouse required" }),
    fromLocationId: z.number({ error: "From location required" }).int().positive({ message: "From location required" }),
    toWarehouseId: z.number({ error: "To warehouse required" }).int().positive({ message: "To warehouse required" }),
    toLocationId: z.number({ error: "To location required" }).int().positive({ message: "To location required" }),
    notes: z
      .string()
      .max(NOTES_MAX, `Notes must be ${NOTES_MAX} characters or fewer`)
      .transform((v) => v.trim())
      .optional(),
    lines: z
      .array(
        z.object({
          productVariantId: z.number({ error: "Variant required" }).int().positive({ message: "Variant required" }),
          quantity: z
            .number({ error: "Quantity must be a number" })
            .positive({ message: "Quantity must be greater than 0" }),
          lotId: z.number().int().positive().optional(),
          serialId: z.number().int().positive().optional(),
        }),
      )
      .min(1, "At least one line required"),
  })
  .refine((d) => d.fromLocationId !== d.toLocationId, {
    message: "From and to locations cannot be the same",
    path: ["toLocationId"],
  });

export type FormValues = z.infer<typeof newTransferSchema>;

