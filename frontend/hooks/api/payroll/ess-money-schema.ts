import { z } from "zod";


export const salaryComponentTypeContract = z.enum([
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "REIMBURSEMENT",
  "TAX",
  "ADJUSTMENT",
]);

export const essSalaryComponentContract = z.object({
  code: z.string(),
  name: z.string(),
  type: salaryComponentTypeContract,
  amount: z.string().nullable(),
  percent: z.string().nullable(),
});

export const essSalaryStructureContract = z.union([
  z.object({
    setupRequired: z.literal(false).or(z.undefined()),
    profile: z.object({
      annualCtc: z.string(),
      workerType: z.string(),
      taxRegime: z.enum(["OLD", "NEW"]).nullable(),
      costCenter: z.string().nullable(),
      effectiveFrom: z.string(),
    }),
    components: z.array(essSalaryComponentContract),
  }),
  z.object({
    setupRequired: z.literal(true),
    profile: z.null(),
    components: z.array(essSalaryComponentContract),
    message: z.string().optional(),
  }),
]);

export const essReimbursementStatusContract = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAID",
]);

export const essReimbursementContract = z.object({
  id: z.number(),
  category: z.string(),
  amount: z.string(),
  description: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  status: essReimbursementStatusContract,
  payrollMonth: z.string().nullable(),
  createdAt: z.string(),
});

export const essReimbursementsContract = z.object({
  items: z.array(essReimbursementContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type EssReimbursementsPage = z.infer<typeof essReimbursementsContract>;

export const essLoanStatusContract = z.enum([
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "REPAID",
  "REJECTED",
]);

export const essLoanContract = z.object({
  id: z.number(),
  amount: z.string(),
  reason: z.string().nullable(),
  emiAmount: z.string().nullable(),
  totalEmis: z.number().nullable(),
  paidEmis: z.number(),
  status: essLoanStatusContract,
  balance: z.string(),
  createdAt: z.string(),
});

export const essLoansContract = z.array(essLoanContract);

export type EssSalaryComponent = z.infer<typeof essSalaryComponentContract>;
export type EssSalaryStructure = z.infer<typeof essSalaryStructureContract>;
export type EssReimbursement = z.infer<typeof essReimbursementContract>;
export type EssLoan = z.infer<typeof essLoanContract>;
