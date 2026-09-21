import type { z } from "zod";
import type { taxWindowContract } from "@/hooks/api/payroll/tax-schema";
import type { fnfStatementContract } from "@/hooks/api/payroll/fnf-schema";
import type { calendarEventContract } from "@/hooks/api/payroll/calendar-schema";
import type {
  summaryReportContract,
  registerReportContract,
  deptCostReportContract,
  costCenterReportContract,
  componentPivotReportContract,
  bankPayoutReportContract,
  varianceReportContract,
  journalReportContract,
} from "@/hooks/api/payroll/reports-schema";

export type PayrollReportType =
  | "summary"
  | "register"
  | "department-cost"
  | "cost-center"
  | "earnings"
  | "deductions"
  | "reimbursements"
  | "tax"
  | "bank-payout"
  | "variance"
  | "journal"
  | "pay-compression";

export type PayrollSummaryReport = z.infer<typeof summaryReportContract>;

export type EmployeeRegisterRow = z.infer<typeof registerReportContract>["rows"][number];

export type PayrollRegisterReport = z.infer<typeof registerReportContract>;

export type DeptCostRow = z.infer<typeof deptCostReportContract>["rows"][number];

export type PayrollDeptCostReport = z.infer<typeof deptCostReportContract>;

export type CostCenterRow = z.infer<typeof costCenterReportContract>["rows"][number];

export type PayrollCostCenterReport = z.infer<typeof costCenterReportContract>;

export type ComponentPivotRow = z.infer<typeof componentPivotReportContract>["rows"][number];

export type ComponentPivotReport = z.infer<typeof componentPivotReportContract>;

export type BankPayoutItem = z.infer<typeof bankPayoutReportContract>["batches"][number]["items"][number];

export type BankPayoutBatch = z.infer<typeof bankPayoutReportContract>["batches"][number];

export type BankPayoutReport = z.infer<typeof bankPayoutReportContract>;

export type VarianceEmployeeRow = z.infer<typeof varianceReportContract>["perEmployee"][number];

export type VarianceReport = z.infer<typeof varianceReportContract>;

export type JournalLine = z.infer<typeof journalReportContract>["lines"][number];

/**
 * Mirrors `JournalResult` in `payroll/insights/journal.service.ts`. The three
 * fields below `unmappedCodes` were dropped from this type once, so the report
 * re-derived the totals in float from `lines` and adjudicated "balanced"
 * itself — over a line set the server had already filtered. The totals are the
 * server's, computed in integer paise; do not recompute them here.
 */
export type JournalReport = z.infer<typeof journalReportContract>;

export interface AccountingMapping {
  id: number;
  componentId: number | null;
  category: string | null;
  ledgerName: string;
  costCenterSource: string | null;
  notes: string | null;
}

export interface CreateAccountingMappingInput {
  componentId?: number;
  category?: string;
  ledgerName: string;
  costCenterSource?: string;
  notes?: string;
}

export type UpdateAccountingMappingInput = Partial<CreateAccountingMappingInput>;

export type PayrollCalendarEvent = z.infer<typeof calendarEventContract>;

export interface CreateCalendarEventInput {
  type: string;
  date: string;
  title: string;
  month?: string;
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>;

export type TaxWindowStatus = "DRAFT" | "OPEN" | "CLOSED" | "LOCKED";

export type TaxWindow = z.infer<typeof taxWindowContract>;

export interface CreateTaxWindowInput {
  financialYear: string;
  opensAt: string;
  closesAt: string;
  proofDeadline?: string;
  lockDate?: string;
}

export type UpdateTaxWindowInput = Partial<CreateTaxWindowInput> & { status?: TaxWindowStatus };

export type TaxDeclarationStatus = "DRAFT" | "SUBMITTED" | "VERIFIED";

export type FnfStatus = "PENDING" | "HR_REVIEW" | "FINANCE_REVIEW" | "APPROVED" | "PAID";

export type FnfStatement = z.infer<typeof fnfStatementContract>;

export type LoanAdjustmentType = "SKIP_EMI" | "EXTRA_RECOVERY" | "FORECLOSURE" | "MANUAL_ADJUST";

export interface CreateLoanAdjustmentInput {
  loanId: number;
  type: LoanAdjustmentType;
  amount?: number;
  reason: string;
}
