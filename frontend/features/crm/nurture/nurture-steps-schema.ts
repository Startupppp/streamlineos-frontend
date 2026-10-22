import { z } from "zod";
import {
  MAX_SEQUENCE_STEPS,
  MAX_STEP_WAIT_HOURS,
  type ReplaceNurtureStepsInput,
} from "@/types/crm/nurture";

const WHOLE_HOURS = /^\d+$/;

export const nurtureStepFieldSchema = z.object({
  waitHours: z
    .string()
    .trim()
    .min(1, "Enter how long to wait")
    .regex(WHOLE_HOURS, "Whole hours only — no decimals, no minus sign")
    .refine(
      (value) => Number(value) <= MAX_STEP_WAIT_HOURS,
      `A step may wait at most ${MAX_STEP_WAIT_HOURS} hours (90 days)`,
    ),
});

export const nurtureStepsSchema = z.object({
  steps: z
    .array(nurtureStepFieldSchema)
    .max(MAX_SEQUENCE_STEPS, `A sequence may have at most ${MAX_SEQUENCE_STEPS} steps`),
});

export type NurtureStepsFormValues = z.infer<typeof nurtureStepsSchema>;

export function toReplaceStepsInput(values: NurtureStepsFormValues): ReplaceNurtureStepsInput {
  return { steps: values.steps.map((step) => ({ waitHours: Number(step.waitHours) })) };
}
