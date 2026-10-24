import { z } from "zod";
import {
  QUESTION_TYPE_LIST,
  QUESTION_TYPE_META,
} from "@/features/surveys/shared/question-type-meta";

const choiceSchema = z.object({
  label: z.string(),
  choiceKey: z.string(),
  value: z.string().optional(),
  score: z.number().optional(),
  isCorrect: z.boolean().optional(),
});

export const questionEditorSchema = z
  .object({
    title: z.string(),
    required: z.boolean(),
    description: z.string(),
    variableName: z.string(),
    choices: z.array(choiceSchema),
    type: z.enum(QUESTION_TYPE_LIST),
    settings: z.record(z.string(), z.unknown()),
  })
  .superRefine((values, ctx) => {
    const meta = QUESTION_TYPE_META[values.type];
    if (!meta.isContentOnly && !values.title.trim())
      ctx.addIssue({
        path: ["title"],
        code: z.ZodIssueCode.custom,
        message: "Title is required",
      });
  });

export type QuestionEditorValues = z.infer<typeof questionEditorSchema>;
