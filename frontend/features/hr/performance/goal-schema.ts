import { z } from "zod";

export const goalSchema = z
  .object({
    userId: z.string(),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title must be at most 100 characters")
      .regex(/[a-zA-Z0-9]/, "Must contain at least one letter or number")
      .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
    description: z
      .string()
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
    targetValue: z
      .string()
      .refine((v) => {
        if (!v) return true;
        const n = Number(v);
        return !isNaN(n) && n > 0 && n <= 9_999_999_999;
      }, "Target value must be a positive number (max 10 digits)")
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

export type GoalFormValues = z.infer<typeof goalSchema>;
