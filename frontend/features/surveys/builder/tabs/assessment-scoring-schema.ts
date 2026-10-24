import { z } from "zod";

export const assessmentScoringSchema = z.object({
  passScore: z.coerce.number().min(0),
  attemptsAllowed: z.coerce.number().min(0),
  timeLimitMinutes: z.coerce.number().min(0),
  certificateOnPass: z.boolean(),
});

export type AssessmentScoringValues = z.infer<typeof assessmentScoringSchema>;
