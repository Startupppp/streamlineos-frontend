import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";

const titleSchema = z
  .string()
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(100, "Title must be at most 100 characters")
  .regex(/[a-zA-Z]/, "Title must contain at least one letter")
  .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces");

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be at most 1000 characters")
  .refine(
    (v) => !v || /[a-zA-Z0-9]/.test(v),
    "Must contain at least one letter or number",
  )
  .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces");

const targetValueSchema = z
  .string()
  .trim()
  .min(1, "Target value is required")
  .refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v),
    "Target value must be a number with up to 2 decimal places",
  )
  .refine((v) => {
    const n = Number(v);
    return !Number.isNaN(n) && n > 0 && n <= 1_000_000;
  }, "Target value must be between 0.01 and 1,000,000");

export function buildGoalSchema(options?: {
  requireEmployee?: boolean;
  enforceFutureDates?: boolean;
}) {
  const requireEmployee = options?.requireEmployee ?? true;
  const enforceFutureDates = options?.enforceFutureDates ?? true;

  return z
    .object({
      userId: requireEmployee
        ? z.string().min(1, "Employee is required")
        : z.string(),
      title: titleSchema,
      description: descriptionSchema,
      targetValue: targetValueSchema,
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
    })
    .superRefine((data, ctx) => {
      if (enforceFutureDates) {
        refineNotBeforeToday(
          data.startDate,
          ctx,
          "startDate",
          "Start date cannot be in the past",
        );
        refineNotBeforeToday(
          data.endDate,
          ctx,
          "endDate",
          "End date cannot be in the past",
        );
      }
      refineDateOrder(data, ctx, {
        mode: "after",
        message: "End date must be after start date",
      });
    });
}

export type GoalFormValues = z.infer<ReturnType<typeof buildGoalSchema>>;

export const GOAL_PROGRESS_INCREMENT_PERCENT = 10;
export const GOAL_PROGRESS_COMPLETE_PERCENT = 100;

export function incrementGoalProgress(currentProgress: number | null | undefined): number {
  return (currentProgress ?? 0) + GOAL_PROGRESS_INCREMENT_PERCENT;
}
