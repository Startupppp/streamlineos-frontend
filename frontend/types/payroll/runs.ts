export type PayrollRunStatus =
  | "PREPARING"
  | "DRAFT"
  | "PREVIEW_READY"
  | "EXCEPTIONS_FOUND"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "LOCKED"
  | "PAID"
  | "PAYSLIPS_PUBLISHED"
  | "CLOSED"
  | "REOPENED";

export type PayrollWorkerType =
  | "EMPLOYEE"
  | "CONTRACTOR"
  | "CONSULTANT"
  | "INTERN"
  | "EOR";

export type PayrollExceptionSeverity = "BLOCKER" | "WARNING" | "INFO";
export type PayrollExceptionStatus = "OPEN" | "RESOLVED" | "OVERRIDDEN";
export type PayrollInputSource =
  | "ATTENDANCE"
  | "LEAVE"
  | "TIMESHEET"
  | "UPLOAD"
  | "MANUAL";

export type SalaryComponentType =
  | "EARNING"
  | "DEDUCTION"
  | "EMPLOYER_CONTRIBUTION"
  | "REIMBURSEMENT"
  | "TAX"
  | "ADJUSTMENT";

export type SalaryProfileStatus = "ACTIVE" | "UPCOMING" | "SUPERSEDED";

export interface PayrollChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: string | null;
  detail: string | null;
}

export interface CalcExplainStep {
  method: string;
  formula?: string;
  inputs: Record<string, number>;
  steps: string[];
  note?: string;
}

export interface CalculationSnapshotLine {
  code: string;
  name: string;
  category: SalaryComponentType;
  amount: string;
  calcMethod: string;
  taxable: boolean;
  sortOrder: number;
  explain: CalcExplainStep;
}

export interface CalculationSnapshot {
  policyVersionId: number | null;
  computedAt: string;
  currency: string;
  scheduledDays: string;
  paidDays: string;
  lopDays: string;
  overtimeHours: string;
  lines: CalculationSnapshotLine[];
  totals: {
    gross: string;
    deductions: string;
    employerContributions: string;
    net: string;
  };
  variance: {
    previousRunId: number | null;
    previousNet: string | null;
    netDelta: string | null;
    netDeltaPercent: number | null;
    changedComponents: { code: string; previous: string | null; current: string | null }[];
  } | null;
}

export interface PayrollRun {
  id: number;
  orgId: string;
  month: string;
  status: PayrollRunStatus;
  runType?: string | null;
  entityId?: number | null;
  periodId?: number | null;
  payDate?: string | null;
  statutoryRuleVersion?: string | null;
  calculationVersion?: string | null;
  grossTotal: string | null;
  deductionTotal: string | null;
  netTotal: string | null;
  employerCostTotal: string | null;
  employeeCount: number | null;
  exceptionCount: number | null;
  reopenReason: string | null;
  policyVersionId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunListItem {
  id: number;
  month: string;
  status: PayrollRunStatus;
  runType?: string | null;
  entityId?: number | null;
  statutoryRuleVersion?: string | null;
  grossTotal: string | null;
  netTotal: string | null;
  employeeCount: number | null;
  exceptionCount: number | null;
  createdAt: string;
}

export interface RunEmployee {
  id: number;
  userId: string;
  workerType: PayrollWorkerType;
  currency: string;
  gross: string | null;
  totalDeductions: string | null;
  net: string | null;
  status: string;
  holdReason: string | null;
  userName: string;
  userEmail: string;
}

export interface RunEmployeeDetail extends RunEmployee {
  calculationSnapshot?: CalculationSnapshot;
}

export interface PayrollException {
  id: number;
  runId: number;
  runEmployeeId: number | null;
  code: string;
  severity: PayrollExceptionSeverity;
  message: string;
  status: PayrollExceptionStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  overrideReason: string | null;
}

export interface RunInput {
  id: number;
  runId: number;
  userId: string;
  userName?: string;
  source: PayrollInputSource;
  scheduledDays: string;
  paidDays: string;
  lopDays: string;
  halfDays: string;
  overtimeHours: string;
  billableHours?: string;
  isOverride: boolean;
  overrideReason: string | null;
  updatedAt: string;
}

export interface EmployeeSalaryProfile {
  id: number;
  userId: string;
  workerType: PayrollWorkerType;
  currency: string;
  payoutCurrency?: string | null;
  annualCtc: string;
  taxRegime: string | null;
  costCenter: string | null;
  status: SalaryProfileStatus;
  effectiveFrom: string;
  userName: string;
  userEmail: string;
}

export interface EmployeeProfileDetail {
  active: EmployeeSalaryProfile | null;
  history: EmployeeSalaryProfile[];
  components: ProfileComponent[];
}

export interface ProfileComponent {
  id: number;
  componentId: number;
  code: string;
  name: string;
  type: SalaryComponentType;
  calcMethod: string;
  amount: string | null;
  percent: string | null;
  isOverride: boolean;
}

export interface VarianceSummary {
  previousMonth: string | null;
  currentNet: string;
  previousNet: string;
  netDelta: string;
  netDeltaPercent: number;
  newJoiners: number;
  exited: number;
  changedEmployees: number;
}

export interface CommandCenterHeader {
  runId: number | null;
  month: string;
  status: PayrollRunStatus | null;
  grossTotal: string;
  deductionTotal: string;
  netTotal: string;
  employerCostTotal: string;
  employeeCount: number;
  exceptionCounts: { BLOCKER: number; WARNING: number; INFO: number };
}

export interface CommandCenterData {
  header: CommandCenterHeader;
  checklist: PayrollChecklistItem[];
  panels: {
    runStatus: PayrollRunStatus | null;
    topExceptions: Pick<PayrollException, "id" | "code" | "severity" | "message" | "status" | "runEmployeeId">[];
    varianceSummary: VarianceSummary | null;
    pendingApprovals: { id: number; stage: number; status: string }[];
    payoutReadiness: boolean;
    statutoryReadiness: {
      taxDeclarationsLocked: boolean;
      packComplianceChecklist: { key: string; label: string; detail: string }[];
    };
  };
  upcomingCalendarEvents: { id: number; date: string; eventType: string; label: string }[];
}

export interface VarianceData {
  currentRun: { id: number; month: string; grossTotal: string | null; netTotal: string | null };
  previousRun: { id: number; month: string; grossTotal: string | null; netTotal: string | null } | null;
  topMovers: { userId: string; net: string | null; userName: string }[];
}
