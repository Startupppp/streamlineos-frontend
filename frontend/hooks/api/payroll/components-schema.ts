import { z } from "zod";

export const salaryComponentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum([
    "EARNING",
    "DEDUCTION",
    "EMPLOYER_CONTRIBUTION",
    "REIMBURSEMENT",
    "TAX",
    "ADJUSTMENT",
  ]),
  calcMethod: z.enum([
    "FIXED",
    "PERCENT_OF_BASIC",
    "PERCENT_OF_GROSS",
    "FORMULA",
    "ATTENDANCE_BASED",
    "TIMESHEET_BASED",
    "MANUAL",
  ]),
  amount: z.string().nullable(),
  percent: z.string().nullable(),
  formula: z.string().nullable(),
  taxable: z.boolean(),
  showOnPayslip: z.boolean(),
  includeInCtc: z.boolean(),
  isStatutory: z.boolean(),
  statutoryKey: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const componentListPaginationContract = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const componentListResponseContract = z.object({
  items: z.array(salaryComponentContract),
  pagination: componentListPaginationContract,
});

export const deleteComponentResponseContract = z.object({
  success: z.boolean(),
  softDeleted: z.boolean(),
});

export type SalaryComponent = z.infer<typeof salaryComponentContract>;
export type ComponentListResponse = z.infer<typeof componentListResponseContract>;
