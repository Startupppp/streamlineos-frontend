import { z } from "zod";

export const budgetFormSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  budgetType: z.enum(["HOURS", "AMOUNT"]),
  budgetValue: z.string().min(1, "Enter a budget amount"),
  currency: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
