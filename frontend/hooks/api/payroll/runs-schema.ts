import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


export const payrollRunStatusContract = z.enum([
  "PREPARING",
  "DRAFT",
  "PREVIEW_READY",
  "EXCEPTIONS_FOUND",
  "PENDING_APPROVAL",
  "APPROVED",
  "LOCKED",
  "PAID",
  "PAYSLIPS_PUBLISHED",
  "CLOSED",
  "REOPENED",
]);

export const payrollWorkerTypeContract = z.enum([
  "EMPLOYEE",
  "CONTRACTOR",
  "CONSULTANT",
  "INTERN",
  "EOR",
]);

export const payrollRunListItemContract = z.object({
  id: z.number(),
  month: z.string(),
  status: payrollRunStatusContract,
  runType: z.string(),
  entityId: z.number().nullable(),
  statutoryRuleVersion: z.string().nullable(),
  grossTotal: z.string(),
  netTotal: z.string(),
  employeeCount: z.number(),
  exceptionCount: z.number(),
  createdAt: z.string(),
});

export const payrollRunsPageContract = cursorPageContract(
  payrollRunListItemContract,
);

export const payrollRunContract = z.object({
  id: z.number(),
  orgId: z.string(),
  month: z.string(),
  status: payrollRunStatusContract,
  runType: z.string(),
  entityId: z.number().nullable(),
  periodId: z.number().nullable(),
  payDate: z.string().nullable(),
  statutoryRuleVersion: z.string().nullable(),
  calculationVersion: z.string().nullable(),
  grossTotal: z.string(),
  deductionTotal: z.string(),
  netTotal: z.string(),
  employerCostTotal: z.string(),
  employeeCount: z.number(),
  exceptionCount: z.number(),
  reopenReason: z.string().nullable(),
  policyVersionId: z.number().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payrollChecklistItemContract = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  href: z.string().nullable(),
  detail: z.string().nullable(),
});

export const payrollVarianceSummaryContract = z.object({
  previousMonth: z.string().nullable(),
  currentNet: z.string(),
  previousNet: z.string(),
  netDelta: z.string(),
  netDeltaPercent: z.number(),
  newJoiners: z.number(),
  exited: z.number(),
  changedEmployees: z.number(),
});

export const payrollRunDetailContract = z.object({
  run: payrollRunContract,
  checklist: z.array(payrollChecklistItemContract),
  varianceSummary: payrollVarianceSummaryContract.nullable(),
  payoutHealth: z
    .object({ failedCount: z.number(), heldCount: z.number() })
    .nullable(),
});

export const runEmployeeContract = z.object({
  id: z.number(),
  userId: z.string(),
  workerType: payrollWorkerTypeContract,
  currency: z.string(),
  gross: z.string(),
  totalDeductions: z.string(),
  net: z.string(),
  status: z.string(),
  holdReason: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string(),
});

export const payrollReportSummaryContract = z.object({
  provisional: z.boolean(),
  run: z
    .object({
      month: z.string(),
      status: payrollRunStatusContract,
      employeeCount: z.number(),
      grossTotal: z.string(),
      deductionTotal: z.string(),
      netTotal: z.string(),
      employerCostTotal: z.string(),
      exceptionCount: z.number(),
    })
    .nullable(),
});

export const runCreateResponseContract = z.object({ runId: z.number() });
export const runOperationResponseContract = z.object({ ok: z.boolean() });

export type PayrollRunStatus = z.infer<typeof payrollRunStatusContract>;
export type PayrollWorkerType = z.infer<typeof payrollWorkerTypeContract>;
export type PayrollRunListItem = z.infer<typeof payrollRunListItemContract>;
export type PayrollRunsPage = z.infer<typeof payrollRunsPageContract>;
export type PayrollRun = z.infer<typeof payrollRunContract>;
export type PayrollChecklistItem = z.infer<typeof payrollChecklistItemContract>;
export type PayrollRunDetail = z.infer<typeof payrollRunDetailContract>;
export type RunEmployee = z.infer<typeof runEmployeeContract>;
export type PayrollReportSummary = z.infer<typeof payrollReportSummaryContract>;
