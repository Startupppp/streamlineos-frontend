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

/** Mirrors the ESS create DTO: `z.number().positive().max(999999)`. */
export const MAX_CLAIM_AMOUNT = 999999;

/**
 * Amount arrives as the input's string, so every bound is a refine over the
 * parsed number. The three the API enforces are all spelled here, because a
 * claim that only fails at the server is a claim the person watches disappear
 * with no field to correct.
 */
export const reimbursementSchema = z.object({
  category: z.string().min(1, "Select a category"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (v) => Number.isFinite(parseFloat(v)),
      "Enter an amount in numbers",
    )
    .refine(
      (v) => parseFloat(v) > 0,
      "Amount must be greater than 0",
    )
    .refine(
      (v) => parseFloat(v) <= MAX_CLAIM_AMOUNT,
      `Amount cannot exceed ₹${MAX_CLAIM_AMOUNT.toLocaleString("en-IN")}`,
    )
    .refine(
      // Read the decimals off the string: `1.005 * 100` is 100.49999999999999
      // in binary floating point, so the same check on the number says two.
      (v) => /^\s*\d+(\.\d{1,2})?\s*$/.test(v),
      "Amount can have at most 2 decimal places",
    ),
  description: z.string().min(1, "Description is required").max(500),
  payrollMonth: z.string().min(1, "Payroll month is required"),
});

export type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;
