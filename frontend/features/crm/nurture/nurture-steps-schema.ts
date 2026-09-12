import { z } from "zod";
import {
  MAX_SEQUENCE_STEPS,
  MAX_STEP_WAIT_HOURS,
  type ReplaceNurtureStepsInput,
} from "@/types/crm/nurture";

/**
 * What the wire will accept, said in the field's own units.
 *
 * `replaceNurtureStepsSchema` takes `z.number().int().min(0).max(2160)`, so a
 * decimal, a negative or anything past ninety days is a 400 — and a 400 on a
 * cadence save reads to the operator as the feature being broken. The floor is
 * deliberately NOT enforced here: the server clamps a too-tight wait upward
 * rather than refusing it, and rejecting at the edge as well would give the same
 * input two different answers depending on which door it came through.
 * `clampNoticeFor` says what the low value will actually become.
 */
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

/**
 * No minimum length. An empty cadence is a legal body — it is how a sequence's
 * steps are cleared — and the editor warns about what that means rather than
 * refusing to express it.
 */
export const nurtureStepsSchema = z.object({
  steps: z
    .array(nurtureStepFieldSchema)
    .max(MAX_SEQUENCE_STEPS, `A sequence may have at most ${MAX_SEQUENCE_STEPS} steps`),
});

export type NurtureStepsFormValues = z.infer<typeof nurtureStepsSchema>;

/** Step numbers are the array's order, so the payload carries the wait alone. */
export function toReplaceStepsInput(values: NurtureStepsFormValues): ReplaceNurtureStepsInput {
  return { steps: values.steps.map((step) => ({ waitHours: Number(step.waitHours) })) };
}
