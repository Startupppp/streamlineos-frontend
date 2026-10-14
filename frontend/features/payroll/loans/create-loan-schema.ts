import { z } from "zod";

// Mirrors createLoanSchema on POST /hr/loans so the bounds show inline, not as a 400 toast.
export const createLoanFormSchema = z.object({
  userId: z.string().min(1, "Select an employee"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) >= 1000, "Loan amount must be at least ₹1,000")
    .refine((v) => Number(v) <= 10_000_000, "Loan amount cannot exceed ₹1,00,00,000"),
  totalEmis: z
    .string()
    .min(1, "Number of EMIs is required")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "At least 1 EMI required")
    .refine((v) => Number(v) <= 360, "Maximum 360 EMIs"),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});

export type CreateLoanValues = z.infer<typeof createLoanFormSchema>;
