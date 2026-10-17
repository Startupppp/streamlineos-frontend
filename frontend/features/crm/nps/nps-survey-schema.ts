import { z } from "zod";

/** Mirrors `createSurveySchema` in customer-executive.schemas.ts. */
export const npsSurveyFormSchema = z.object({
  title: z.string().trim().min(1, "Give the survey a title").max(200),
  question: z.string().trim().min(1, "Write the question respondents answer").max(500),
});

export type NpsSurveyFormValues = z.infer<typeof npsSurveyFormSchema>;
