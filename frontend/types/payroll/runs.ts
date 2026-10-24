import type { z } from "zod";
import type { runVarianceResponseContract } from "@/hooks/api/payroll/run-employees-schema";
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

export interface PayrollSourceRef {
  table: string;
  id: number | string | null;
  label: string;
  date?: string | null;
  endDate?: string | null;
}

export interface CalcExplainStep {
  steps: string[];
  note?: string;
  formula?: string;
  inputs?: Record<string, number>;
  sources?: PayrollSourceRef[];
}


export interface CalculationSnapshot {
  policyVersionId: number | null;
  computedAt: string;
  currency: string;
  scheduledDays: string;
  paidDays: string;
  lopDays: string;
  overtimeHours: string;
  lopSources?: PayrollSourceRef[];
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
    changedComponents: {
      code: string;
      previous: string | null;
      current: string | null;
    }[];
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




export interface EmployeeSalaryProfile {
  id: number;
  userId: string | null;
  workerId?: string | null;
  workerType: PayrollWorkerType;
  currency: string;
  payoutCurrency?: string | null;
  annualCtc: string;
  taxRegime: string | null;
  costCenter: string | null;
  status: SalaryProfileStatus;
  effectiveFrom: string;
  userName: string | null;
  userEmail: string | null;
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

export type VarianceData = z.infer<typeof runVarianceResponseContract>;
