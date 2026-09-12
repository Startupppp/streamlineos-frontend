import { z } from "zod";

export const CLAIM_CATEGORIES = [
  "Travel",
  "Food",
  "Internet",
  "Medical",
  "Fuel",
  "Office Supplies",
  "Client Expenses",
  "Other",
];

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const reimbursementSchema = z.object({
  category: z.string().min(1, "Select a category"),
  amount: z.string().min(1, "Amount is required").refine((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0;
  }, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required").max(500),
  payrollMonth: z.string().min(1, "Payroll month is required"),
});

export type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;
