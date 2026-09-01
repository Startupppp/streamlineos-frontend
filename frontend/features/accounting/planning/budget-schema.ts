import { z } from "zod";

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required"),
  periodType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  dimensionType: z.enum(["NONE", "DEPARTMENT", "PROJECT"]),
});

export type CreateBudgetForm = z.infer<typeof createBudgetSchema>;
