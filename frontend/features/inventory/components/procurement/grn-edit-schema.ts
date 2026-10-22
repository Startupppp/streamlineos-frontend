import { z } from "zod";

export const grnDraftEditSchema = z.object({
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date the goods arrived"),
  notes: z.string().trim().max(2000).optional(),
});

export type GrnDraftEditFormValues = z.input<typeof grnDraftEditSchema>;
export type GrnDraftEditFormOutput = z.output<typeof grnDraftEditSchema>;
