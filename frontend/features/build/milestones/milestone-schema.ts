import { z } from "zod";

export const milestoneFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]),
});

export type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;
