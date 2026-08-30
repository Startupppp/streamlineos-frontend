import { z } from "zod";

export const duplicateBudgetSchema = z.object({
  newFiscalYear: z.string().min(1, "Required"),
  newName: z.string().min(1, "Required"),
  upliftPct: z.string(),
});

export type DuplicateBudgetForm = z.infer<typeof duplicateBudgetSchema>;
