import { z } from "zod";

/**
 * Employee self-service money beyond the payslip: what someone is paid, what
 * they are owed and what they owe back.
 *
 * Every amount is a `decimal(15,2)` string. `balance` on a loan is computed
 * server-side and rounded to two places; `percent` on a salary component is
 * `decimal(7,4)`, so it arrives as `"40.0000"` and is a percentage, not a rate.
 *
 * `description` on a reimbursement is nullable in the database even though the
 * client type demanded a string — an expense filed with no note read as the
 * literal `undefined` in the UI.
 */

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

export const essSalaryStructureContract = z.object({
  profile: z.object({
    annualCtc: z.string(),
    workerType: z.string(),
    taxRegime: z.enum(["OLD", "NEW"]).nullable(),
    costCenter: z.string().nullable(),
    effectiveFrom: z.string(),
  }),
  components: z.array(essSalaryComponentContract),
});

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

/**
 * A bare array. The route takes `page` and `limit` and returns no `total`, no
 * `hasMore` and no cursor, so the page count is not recoverable from the body.
 */
export const essReimbursementsContract = z.array(essReimbursementContract);

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

/** Also a bare array, silently truncated at the service default of 100. */
export const essLoansContract = z.array(essLoanContract);

export type EssSalaryComponent = z.infer<typeof essSalaryComponentContract>;
export type EssSalaryStructure = z.infer<typeof essSalaryStructureContract>;
export type EssReimbursement = z.infer<typeof essReimbursementContract>;
export type EssLoan = z.infer<typeof essLoanContract>;
