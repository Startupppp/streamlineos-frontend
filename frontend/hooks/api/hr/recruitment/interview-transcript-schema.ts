import { z } from "zod";

/**
 * A transcript and the facts that make holding it lawful.
 *
 * `consentAt` is an instant rather than a flag, matching the column: a
 * recording belongs to the candidate as well as the panel, and "did they agree"
 * needs the moment it was recorded. `providerBlockedReason` says why an
 * automatic transcription is unavailable, so the manual path reads as the
 * current alternative rather than the only thing ever intended.
 */
export const interviewTranscriptContract = z.object({
  interviewId: z.number().int(),
  transcript: z.string().nullable(),
  source: z.enum(["MANUAL_UPLOAD", "PROVIDER"]).nullable(),
  consentAt: z.coerce.date().nullable(),
  retainUntil: z.coerce.date().nullable(),
  storedAt: z.coerce.date().nullable(),
  providerBlockedReason: z.string().nullable(),
});

export const erasedTranscriptContract = z.object({ erased: z.boolean() });

export type InterviewTranscript = z.infer<typeof interviewTranscriptContract>;
