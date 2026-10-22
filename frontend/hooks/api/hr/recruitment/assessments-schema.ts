import { z } from "zod";

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
