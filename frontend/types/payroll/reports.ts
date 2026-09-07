import type { z } from "zod";
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

export type CalendarEventStatus = "upcoming" | "due" | "overdue";

export interface PayrollCalendarEvent {
  id: number;
  type: string;
  date: string;
  title: string;
  month: string | null;
  status: CalendarEventStatus;
}

export interface CreateCalendarEventInput {
  type: string;
  date: string;
  title: string;
  month?: string;
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>;

export type TaxWindowStatus = "DRAFT" | "OPEN" | "CLOSED" | "LOCKED";

export interface TaxWindow {
  id: number;
  financialYear: string;
  opensAt: string;
  closesAt: string;
  proofDeadline: string | null;
  lockDate: string | null;
  status: TaxWindowStatus;
}

export interface CreateTaxWindowInput {
  financialYear: string;
  opensAt: string;
  closesAt: string;
  proofDeadline?: string;
  lockDate?: string;
}

export type UpdateTaxWindowInput = Partial<CreateTaxWindowInput> & { status?: TaxWindowStatus };

export type TaxDeclarationStatus = "DRAFT" | "SUBMITTED" | "VERIFIED";
export type TaxRegime = "NEW" | "OLD";

export interface TaxDeclarationAdmin {
  id: number;
  orgId: string;
  userId: string;
  financialYear: string;
  regime: TaxRegime;
  hra: number;
  lta: number;
  section80c: number;
  section80d: number;
  section80g: number;
  homeLoanInterest: number;
  status: TaxDeclarationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
}

export type FnfStatus = "PENDING" | "HR_REVIEW" | "FINANCE_REVIEW" | "APPROVED" | "PAID";

export interface FnfSettlement {
  id: number;
  orgId: string;
  userId: string;
  basicDues: number;
  leaveEncashment: number;
  bonusDue: number;
  deductions: number;
  loanRecovery: number;
  netPayable: number;
  status: FnfStatus;
  approvedBy: string | null;
  notes: string | null;
  reimbursementsDue: number;
  assetRecovery: number;
  noticeRecovery: number;
  otherDeductions: number;
  statementPublishedAt: string | null;
  userName: string;
  userEmail: string;
}

export interface FnfStatementComponent {
  label: string;
  amount: number;
  type: string | null;
}

export interface FnfStatement {
  settlementId: number;
  employee: { id: string; name: string; email: string };
  components: FnfStatementComponent[];
  netPayable: number;
  status: FnfStatus;
}

export type LoanAdjustmentType = "SKIP_EMI" | "EXTRA_RECOVERY" | "FORECLOSURE" | "MANUAL_ADJUST";

export interface CreateLoanAdjustmentInput {
  loanId: number;
  type: LoanAdjustmentType;
  amount?: number;
  reason: string;
}
