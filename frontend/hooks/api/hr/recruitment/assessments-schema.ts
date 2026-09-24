import { z } from "zod";

/**
 * An assessment sent to a candidate.
 *
 * `score` is a percentage, normalised on the server: two vendors reporting "42"
 * mean different things, and a recruiter comparing candidates across vendors
 * would otherwise be comparing nothing.
 *
 * `result` stays PENDING when the organisation has set no pass mark, even once
 * a score has arrived — a verdict on a bar this product invented is not a
 * verdict the organisation reached.
 */
export const assessmentViewContract = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  testId: z.string().nullable(),
  reference: z.string().nullable(),
  candidateUrl: z.string().nullable(),
  result: z.enum(["PENDING", "PASSED", "FAILED", "NO_SHOW"]),
  score: z.number().int().nullable(),
  scoredAt: z.coerce.date().nullable(),
  invitedAt: z.coerce.date(),
  providerBlockedReason: z.string().nullable(),
});

export const assessmentListContract = z.array(assessmentViewContract);
export type AssessmentView = z.infer<typeof assessmentViewContract>;
