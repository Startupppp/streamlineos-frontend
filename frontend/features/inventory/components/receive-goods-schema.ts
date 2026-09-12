import { z } from "zod";
import { decimalQuantityOrZeroSchema } from "@/features/inventory/lib/quantity-schema";

/**
 * `"none"` is a sentinel, not a reason.
 *
 * A Radix `SelectItem` cannot carry an empty value, so "no discrepancy" needs a
 * string of its own; it is stripped when the payload is built rather than being
 * sent to an API whose enum has never heard of it.
 */
export const NO_DISCREPANCY = "none";

const grnLineSchema = z.object({
  poLineId: z.number(),
  quantityReceived: decimalQuantityOrZeroSchema,
  discrepancyReason: z.enum([NO_DISCREPANCY, "SHORT", "OVER", "DAMAGED", "WRONG_ITEM"]).optional(),
  qualityStatus: z.enum(["ACCEPTED", "REJECTED"]),
  rejectionReason: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  manufactureDate: z.string().optional(),
  serialNumbers: z.string().optional(),
});

export const grnSchema = z.object({
  locationId: z.number({ error: "Location is required" }).int().positive(),
  notes: z.string().max(500).optional(),
  lines: z
    .array(grnLineSchema)
    .refine(
      (lines) =>
        lines.every(
          (l) => l.qualityStatus === "ACCEPTED" || (l.rejectionReason && l.rejectionReason.length > 0),
        ),
      { message: "Rejection reason required for rejected lines" },
    ),
});

export type GrnFormValues = z.infer<typeof grnSchema>;
export type GrnFormLine = GrnFormValues["lines"][number];
