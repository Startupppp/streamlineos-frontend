import { z } from "zod";
import type { ComponentType, CalcMethod } from "@/types/payroll/setup";

export const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: "EARNING", label: "Earning" },
  { value: "DEDUCTION", label: "Deduction" },
  { value: "EMPLOYER_CONTRIBUTION", label: "Employer Contribution" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: "TAX", label: "Tax" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export const CALC_METHODS: { value: CalcMethod; label: string }[] = [
  { value: "FIXED", label: "Fixed Amount" },
  { value: "PERCENT_OF_BASIC", label: "% of Basic" },
  { value: "PERCENT_OF_GROSS", label: "% of Gross" },
  { value: "FORMULA", label: "Formula" },
  { value: "ATTENDANCE_BASED", label: "Attendance Based" },
  { value: "TIMESHEET_BASED", label: "Timesheet Based" },
  { value: "MANUAL", label: "Manual Input" },
];

export const FORMULA_HELP =
  "Variables: basic, gross, ctc, days_in_month, paid_days, lop_days, overtime_hours, incentive_amount, reimbursement_amount";

export const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
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
  amount: z.string().optional(),
  percent: z.string().optional(),
  formula: z.string().optional(),
  taxable: z.boolean(),
  showOnPayslip: z.boolean(),
  includeInCtc: z.boolean(),
  sortOrder: z.string().optional(),
});

export type ComponentForm = z.infer<typeof componentFormSchema>;
