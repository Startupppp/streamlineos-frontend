import { z } from "zod";

export function createConfirmationPhraseSchema(phrase: string) {
  return z.object({
    confirmationPhrase: z
      .string()
      .refine((value) => value.trim() === phrase, { message: `Type ${phrase} exactly as shown` }),
  });
}

export type ConfirmationPhraseValues = z.infer<ReturnType<typeof createConfirmationPhraseSchema>>;
