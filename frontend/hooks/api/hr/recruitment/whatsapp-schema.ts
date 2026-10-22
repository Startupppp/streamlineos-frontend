import { z } from "zod";

export const whatsappStateContract = z.object({
  candidateId: z.number().int(),
  optInAt: z.coerce.date().nullable(),
  optOutAt: z.coerce.date().nullable(),
  canSend: z.boolean(),
  refusal: z.string().nullable(),
  providerBlockedReason: z.string().nullable(),
});

export type WhatsappState = z.infer<typeof whatsappStateContract>;
