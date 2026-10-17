import { z } from "zod";

/**
 * A voice screen, and whether anybody actually spoke to the candidate.
 *
 * `completedBy` is the field that matters: it is null until a result arrives
 * with answers in it, so a screen that was requested and never happened cannot
 * read as one that did.
 */
export const voiceScreenViewContract = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  reference: z.string().nullable(),
  result: z.enum(["PENDING", "PASSED", "FAILED", "NO_SHOW"]),
  rating: z.number().int().nullable(),
  script: z.array(z.string()),
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      confidence: z.number().nullable(),
    }),
  ),
  requestedAt: z.coerce.date(),
  completedBy: z.enum(["PROVIDER", "RECRUITER"]).nullable(),
  providerBlockedReason: z.string().nullable(),
});

export const voiceScreenListContract = z.array(voiceScreenViewContract);
export type VoiceScreenView = z.infer<typeof voiceScreenViewContract>;
