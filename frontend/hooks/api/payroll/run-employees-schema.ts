import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

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
  calculationSnapshot: z.record(z.string(), z.unknown()).nullable(),
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
