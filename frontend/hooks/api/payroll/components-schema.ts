import { z } from "zod";
import { DB_ENUMS } from "@/contracts/db-enums.generated";

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
  payCategory: z.enum(DB_ENUMS.salary_component_pay_category).catch("REGULAR"),
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

const componentListItemContract = salaryComponentContract.extend({
  profileCount: z.number(),
});

export const componentListResponseContract = z.object({
  items: z.array(componentListItemContract),
  pagination: componentListPaginationContract,
});

export type SalaryComponent = z.infer<typeof salaryComponentContract>;
export type SalaryComponentListItem = z.infer<typeof componentListItemContract>;
export type ComponentListResponse = z.infer<
  typeof componentListResponseContract
>;
