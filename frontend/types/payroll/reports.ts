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
  | "journal";

export interface PayrollSummaryReport {
  run: {
    month: string;
    status: string;
    employeeCount: number;
    grossTotal: number;
    deductionTotal: number;
    netTotal: number;
    employerCostTotal: number;
    exceptionCount: number;
  } | null;
  provisional: boolean;
}

export interface EmployeeRegisterRow {
  employeeId: string;
  name: string;
  department: string;
  workerType: string;
  paidDays: number;
  gross: number;
  totalDeductions: number;
  net: number;
  components: Record<string, string>;
}

export interface PayrollRegisterReport {
  provisional: boolean;
  columns: string[];
  rows: EmployeeRegisterRow[];
}

export interface DeptCostRow {
  department: string;
  employeeCount: number;
  grossTotal: number;
  netTotal: number;
  employerCostTotal: number;
}

export interface PayrollDeptCostReport {
  rows: DeptCostRow[];
}

export interface CostCenterRow {
  costCenter: string;
  employeeCount: number;
  grossTotal: number;
  netTotal: number;
}

export interface PayrollCostCenterReport {
  rows: CostCenterRow[];
}

export interface ComponentPivotRow {
  employeeId: string;
  name: string;
  department: string;
  workerType: string;
  components: Record<string, string>;
}

export interface ComponentPivotReport {
  provisional: boolean;
  columns: string[];
  rows: ComponentPivotRow[];
}

export interface BankPayoutItem {
  userName: string;
  accountMasked: string;
  ifsc: string;
  amount: number;
  status: string;
}

export interface BankPayoutBatch {
  batchNumber: string;
  format: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  generatedAt: string | null;
  items: BankPayoutItem[];
}

export interface BankPayoutReport {
  batches: BankPayoutBatch[];
}

export interface VarianceEmployeeRow {
  userId: string;
  name: string;
  prevGross: number;
  currGross: number;
  grossDelta: number;
  prevNet: number;
  currNet: number;
  netDelta: number;
}

export interface VarianceReport {
  perEmployee: VarianceEmployeeRow[];
}

export interface JournalLine {
  account: string;
  description: string;
  debit: number;
  credit: number;
  costCenter: string | null;
}

export interface JournalReport {
  lines: JournalLine[];
  unmappedCodes: string[];
}

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
