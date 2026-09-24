import { z } from "zod";

/**
 * A candidate's WhatsApp position.
 *
 * Two timestamps rather than a status, matching the columns: DPDP asks when
 * consent was given and when it was withdrawn, and one field answers neither.
 * `refusal` is the server's own sentence, because "never asked" and "asked not
 * to be" are different situations and only one of them may be fixed by asking.
 */
export const whatsappStateContract = z.object({
  candidateId: z.number().int(),
  optInAt: z.coerce.date().nullable(),
  optOutAt: z.coerce.date().nullable(),
  canSend: z.boolean(),
  refusal: z.string().nullable(),
  providerBlockedReason: z.string().nullable(),
});

export type WhatsappState = z.infer<typeof whatsappStateContract>;
