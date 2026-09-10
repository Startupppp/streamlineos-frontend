import { z } from "zod";

/**
 * Mirrors the header half of `updateGrnDraftSchema`.
 *
 * `lines` is deliberately absent. The backend takes it and its comment says what
 * it means — "these are the lines" is a recount — which is a different act from
 * correcting the date somebody typed, needs the quantity/lot/serial grid the
 * receiving sheet owns, and belongs wherever a recount is actually performed.
 * `locationId` is absent for a smaller reason: the detail sheet does not display
 * a location, so there is nothing here to correct.
 */
export const grnDraftEditSchema = z.object({
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date the goods arrived"),
  notes: z.string().trim().max(2000).optional(),
});

export type GrnDraftEditFormValues = z.input<typeof grnDraftEditSchema>;
export type GrnDraftEditFormOutput = z.output<typeof grnDraftEditSchema>;
