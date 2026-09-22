import { z } from "zod";

export const createPositionFormSchema = z.object({
  title: z.string().trim().min(1, "Position title is required").max(300, "Position title must be 300 characters or fewer"),
  status: z.string().min(1, "Status is required"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  departmentId: z.string(),
  budgetedCost: z
    .string()
    .trim()
    .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) > 0), "Budgeted cost must be a positive amount"),
});

export type CreatePositionFormValues = z.infer<typeof createPositionFormSchema>;

export const CREATE_POSITION_DEFAULTS: CreatePositionFormValues = {
  title: "",
  status: "",
  effectiveFrom: "",
  departmentId: "",
  budgetedCost: "",
};

export function budgetedCostCentsOf(budgetedCost: string): number | undefined {
  if (budgetedCost === "") return undefined;
  return Math.round(Number(budgetedCost) * 100);
}
