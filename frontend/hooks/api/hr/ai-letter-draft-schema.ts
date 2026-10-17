import { z } from "zod";

export const HR_AI_LETTER_TYPES = [
  "offer",
  "appointment",
  "appreciation",
  "warning",
  "promotion",
  "termination_notice",
  "experience",
] as const;

export type HrAiLetterType = (typeof HR_AI_LETTER_TYPES)[number];

export const letterDraftContract = z.object({
  subject: z.string(),
  body: z.string(),
  disclaimer: z.string(),
  advisory: z.literal(true),
});

export type LetterDraftResult = z.infer<typeof letterDraftContract>;
