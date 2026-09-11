import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const calcExplainStepContract = z.object({
  steps: z.array(z.string()),
  note: z.string().optional(),
});

const calculationSnapshotLineContract = z.object({
  code: z.string(),
  name: z.string(),
  category: z.enum(["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "REIMBURSEMENT", "TAX", "ADJUSTMENT"]),
  amount: z.string(),
  calcMethod: z.string(),
  taxable: z.boolean(),
  sortOrder: z.number(),
  explain: calcExplainStepContract,
});

export const calculationSnapshotContract = z.object({
  policyVersionId: z.number().nullable(),
  computedAt: z.string(),
  currency: z.string(),
  scheduledDays: z.string(),
  paidDays: z.string(),
  lopDays: z.string(),
  overtimeHours: z.string(),
  lines: z.array(calculationSnapshotLineContract),
  totals: z.object({
    gross: z.string(),
    deductions: z.string(),
    employerContributions: z.string(),
    net: z.string(),
  }),
  variance: z.object({
    previousRunId: z.number().nullable(),
    previousNet: z.string().nullable(),
    netDelta: z.string().nullable(),
    netDeltaPercent: z.number().nullable(),
    changedComponents: z.array(z.object({
      code: z.string(),
      previous: z.string().nullable(),
      current: z.string().nullable(),
    })),
  }).nullable().optional(),
}).nullable();

export type CalculationSnapshot = z.infer<typeof calculationSnapshotContract>;

export const runEmployeeListItemContract = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  workerType: z.string(),
  currency: z.string(),
  gross: z.string(),
  totalDeductions: z.string(),
  net: z.string(),
  status: z.string(),
  holdReason: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string(),
});

export const runListEmployeesResponseContract = cursorPageContract(runEmployeeListItemContract);

export const runEmployeeDetailContract = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  workerType: z.string(),
  currency: z.string(),
  gross: z.string(),
  totalDeductions: z.string(),
  net: z.string(),
  status: z.string(),
  holdReason: z.string().nullable(),
  calculationSnapshot: calculationSnapshotContract,
  userName: z.string().nullable(),
  userEmail: z.string(),
});

const varianceRunSummaryContract = z.object({
  id: z.number(),
  month: z.string(),
  grossTotal: z.string(),
  netTotal: z.string(),
});

const topMoverContract = z.object({
  userId: z.string().nullable(),
  net: z.string(),
  userName: z.string().nullable(),
  paidDays: z.string(),
  lopDays: z.string(),
  baselineSource: z.string().nullable(),
  inputBaseline: z
    .object({
      lockedPaidDays: z.string().nullable(),
      lockedLopDays: z.string().nullable(),
      paidDaysDelta: z.number().nullable(),
      lopDaysDelta: z.number().nullable(),
    })
    .nullable(),
  netDeltaPercent: z.number().nullable(),
});

export const runVarianceResponseContract = z.object({
  currentRun: varianceRunSummaryContract,
  previousRun: varianceRunSummaryContract.nullable(),
  topMovers: z.array(topMoverContract),
  lockedInputBaselinesUsed: z.boolean(),
});

export const addAdjustmentResponseContract = z.object({ ok: z.boolean() });

export type RunEmployeeListItem = z.infer<typeof runEmployeeListItemContract>;
export type RunEmployeeDetail = z.infer<typeof runEmployeeDetailContract>;
