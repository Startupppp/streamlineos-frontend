import { z } from "zod";

/**
 * B9, item 5. The credit note or refund this return expects, as a reference
 * into whatever system raised it.
 *
 * Optional, and deliberately free text: this is a pointer at another system's
 * document, not the beginning of a payments integration. Leaving it blank
 * approves the return exactly as fully — the stock never waits on a credit.
 */
export const approveReturnSchema = z.object({
  creditReference: z.string().trim().max(200).optional(),
});

export type ApproveReturnFormValues = z.infer<typeof approveReturnSchema>;
