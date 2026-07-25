import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";

const objectiveSchema = z.object({
  objective: z
    .string()
    .trim()
    .min(3, "Objective must be at least 3 characters")
    .max(500, "Objective must be at most 500 characters"),
  metric: z
    .string()
    .trim()
    .min(3, "Success metric must be at least 3 characters")
    .max(200, "Success metric must be at most 200 characters"),
  deadline: z.string().min(1, "Deadline is required"),
});

export function buildPipSchema(options?: { enforceFutureStart?: boolean }) {
  const enforceFutureStart = options?.enforceFutureStart ?? true;

  return z
    .object({
      userId: z.string().min(1, "Employee is required"),
      hrRepId: z.string(),
      reason: z
        .string()
        .trim()
        .min(10, "Reason must be at least 10 characters")
        .max(1000, "Reason must be at most 1000 characters")
        .regex(/[a-zA-Z0-9]/, "Reason must contain at least one letter or number")
        .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
      notes: z
        .string()
        .trim()
        .max(2000, "Notes must be at most 2000 characters"),
      objectives: z
        .array(objectiveSchema)
        .min(1, "At least one complete objective is required"),
    })
    .superRefine((data, ctx) => {
      if (data.hrRepId && data.hrRepId === data.userId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "HR representative cannot be the same as the employee",
          path: ["hrRepId"],
        });
      }
      if (enforceFutureStart) {
        refineNotBeforeToday(
          data.startDate,
          ctx,
          "startDate",
          "Start date cannot be in the past",
        );
      }
      refineDateOrder(data, ctx, {
        mode: "after",
        message: "End date must be after start date",
      });
      data.objectives.forEach((obj, index) => {
        if (obj.deadline && data.startDate && obj.deadline < data.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Deadline must be on or after the PIP start date",
            path: ["objectives", index, "deadline"],
          });
        }
        if (obj.deadline && data.endDate && obj.deadline > data.endDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Deadline cannot exceed the PIP end date",
            path: ["objectives", index, "deadline"],
          });
        }
      });
    });
}

export const pipSchema = buildPipSchema();

export type PipFormValues = z.infer<ReturnType<typeof buildPipSchema>>;
