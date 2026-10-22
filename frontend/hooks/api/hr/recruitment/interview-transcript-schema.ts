import { z } from "zod";

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
