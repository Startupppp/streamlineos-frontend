import { z } from "zod";

export const intakeFormSchema = z.object({
  title: z.string().min(1, "Request title is required").max(200, "Title must be 200 characters or fewer"),
  description: z.string().max(5000, "Description must be 5000 characters or fewer").optional(),
  submitterName: z.string().max(200, "Name must be 200 characters or fewer").optional(),
  submitterEmail: z
    .union([z.string().email("Please enter a valid email address"), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  requestType: z.enum(["bug", "feature", "task", "question", "other"]).optional(),
});

export type IntakeFormValues = z.input<typeof intakeFormSchema>;
export type IntakeFormOutput = z.output<typeof intakeFormSchema>;
