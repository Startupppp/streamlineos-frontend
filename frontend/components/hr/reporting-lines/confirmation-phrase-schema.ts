import { z } from "zod";

/**
 * A bulk reporting change affecting 10+ employees needs the server-issued phrase
 * (`BulkJob.confirmationPhrase`, e.g. "CONFIRM 12") typed back. The match is
 * exact apart from surrounding whitespace; the server re-checks it.
 */
export function createConfirmationPhraseSchema(phrase: string) {
  return z.object({
    confirmationPhrase: z
      .string()
      .refine((value) => value.trim() === phrase, { message: `Type ${phrase} exactly as shown` }),
  });
}

export type ConfirmationPhraseValues = z.infer<ReturnType<typeof createConfirmationPhraseSchema>>;
