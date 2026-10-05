import { z } from "zod";

const salaryPreviewTotalsContract = z.object({
  gross: z.string(),
  deductions: z.string(),
  employerContributions: z.string(),
  net: z.string(),
});

export const salaryPreviewContract = z.object({
  annualCtc: z.string(),
  month: z.string(),
  regime: z.enum(["OLD", "NEW"]),
  stateCode: z.string().nullable(),
  lines: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      category: z.enum(["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "REIMBURSEMENT", "TAX", "ADJUSTMENT"]),
      taxable: z.boolean(),
      monthly: z.string(),
      annual: z.string(),
      note: z.string().nullable(),
    }),
  ),
  monthly: salaryPreviewTotalsContract,
  annual: salaryPreviewTotalsContract,
  warnings: z.array(z.string()),
});

export type SalaryPreview = z.infer<typeof salaryPreviewContract>;
export type SalaryPreviewLine = SalaryPreview["lines"][number];
