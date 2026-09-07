import { z } from "zod";

export const publicNpsSurveyContract = z.object({
  survey: z.object({
    title: z.string(),
    question: z.string(),
    status: z.enum(["draft", "active", "closed"]),
  }),
});

export const submitNpsResponseContract = z.object({ success: z.boolean() });
