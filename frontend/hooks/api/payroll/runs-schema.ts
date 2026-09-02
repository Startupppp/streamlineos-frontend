import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Payroll runs — the highest-consequence money in the product.
 *
 * EVERY amount on these routes is a `decimal(15,2)` handed back by the driver
 * as a STRING. There is no `mode: "number"` and no `.$type<number>()` anywhere
 * in `src/db/schema/payroll/**`, so a client that treated one as a number would
 * be adding pay with `+` on strings. The columns are also `.notNull()`, so the
 * `| null` the hand-written types carried was never reachable — a totals row
 * defaulting through `?? "0"` was dead code hiding a real absence.
 *
 * `paidDays` on the register is `decimal(5,1)` — ONE decimal place, not two.
 *
 * `status` on a run employee looks like an enum and is not: the column is plain
 * `text` defaulting to "PENDING", and the payout path writes "PAID".
 */

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

/**
 * The detail route returns the unprojected row, so `orgId` and the whole audit
 * trail come with it. Declared here are the columns the client reads plus every
 * money and status field, which is what the contract exists to police.
 */
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
  /** Has a default but no NOT NULL, so it really can arrive null. */
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
  /** Null unless there is a prior locked run to compare against. */
  varianceSummary: payrollVarianceSummaryContract.nullable(),
  /** Null unless the run is paid AND at least one payout item failed or is held. */
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

export const runEmployeesPageContract = cursorPageContract(runEmployeeContract);

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

export type PayrollRunStatus = z.infer<typeof payrollRunStatusContract>;
export type PayrollWorkerType = z.infer<typeof payrollWorkerTypeContract>;
export type PayrollRunListItem = z.infer<typeof payrollRunListItemContract>;
export type PayrollRunsPage = z.infer<typeof payrollRunsPageContract>;
export type PayrollRun = z.infer<typeof payrollRunContract>;
export type PayrollChecklistItem = z.infer<typeof payrollChecklistItemContract>;
export type PayrollRunDetail = z.infer<typeof payrollRunDetailContract>;
export type RunEmployee = z.infer<typeof runEmployeeContract>;
export type RunEmployeesPage = z.infer<typeof runEmployeesPageContract>;
export type PayrollReportSummary = z.infer<typeof payrollReportSummaryContract>;
