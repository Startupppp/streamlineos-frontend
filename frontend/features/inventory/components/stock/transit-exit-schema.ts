import { z } from "zod";
import { TRANSIT_EXIT_DISPOSITIONS } from "@/hooks/api/inventory/transit";

/**
 * Mirrors `transitExitSchema` on the backend for one line at a time.
 *
 * The reason is required and free text there, and it is required and free text
 * here: a fixed list would push every real answer into "Other", and the whole
 * value of this command is that somebody can later read why the units left the
 * books. A quantity is optional server-side — absent means the whole stranded
 * remainder — so the form defaults it to that remainder and lets it be reduced.
 */
export const transitExitSchema = z.object({
  disposition: z.enum(TRANSIT_EXIT_DISPOSITIONS),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a quantity with up to 4 decimal places")
    .refine((value) => Number(value) > 0, "The quantity has to be more than zero"),
  reason: z
    .string()
    .trim()
    .min(1, "Say why these units are leaving transit")
    .max(500, "Keep the reason under 500 characters"),
});

export type TransitExitFormValues = z.input<typeof transitExitSchema>;
export type TransitExitFormOutput = z.output<typeof transitExitSchema>;
