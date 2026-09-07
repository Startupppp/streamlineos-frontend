import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const journalBatchLineContract = z.object({
  lineNo: z.number(),
  account: z.string(),
  description: z.string(),
  debit: z.string(),
  credit: z.string(),
  costCenter: z.string().nullable(),
});

export const journalBatchSummaryContract = z.object({
  id: z.number(),
  periodKey: z.string(),
  version: z.number(),
  status: z.enum(["DRAFT", "POSTED", "EXPORTED", "REVERSED", "FAILED"]),
  reconciliationStatus: z.string(),
  reversalOfBatchId: z.number().nullable(),
  provisional: z.boolean(),
  totalDebits: z.string(),
  totalCredits: z.string(),
  lineCount: z.number(),
  unmappedCodes: z.array(z.string()),
  runId: z.number().nullable(),
  note: z.string().nullable(),
  reversalReason: z.string().nullable(),
  reconciliationNote: z.string().nullable(),
  postedAt: z.string().nullable(),
  exportedAt: z.string().nullable(),
  reversedAt: z.string().nullable(),
  reconciledAt: z.string().nullable(),
  createdAt: z.string(),
});

export const journalBatchDetailContract = journalBatchSummaryContract.extend({
  lines: z.array(journalBatchLineContract),
});

export const journalBatchListContract = cursorPageContract(journalBatchSummaryContract);

const periodReconCheckContract = z.object({
  key: z.string(),
  label: z.string(),
  ok: z.boolean(),
  severity: z.string(),
  detail: z.string(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  delta: z.string().optional(),
});

export const periodReconciliationReportContract = z.object({
  periodKey: z.string(),
  mode: z.literal("export_manual"),
  honestyNote: z.string(),
  run: z.object({
    id: z.number(),
    status: z.string(),
    netTotal: z.string(),
    grossTotal: z.string(),
    employeeCount: z.number().nullable(),
  }).nullable(),
  payout: z.object({
    batchCount: z.number(),
    totalPaid: z.string(),
    totalPending: z.string(),
    totalFailed: z.string(),
    batches: z.array(z.object({
      id: z.number(),
      batchNumber: z.string(),
      status: z.string(),
      totalAmount: z.string(),
      itemCount: z.number(),
    })),
  }),
  journal: z.object({
    batchId: z.number(),
    version: z.number(),
    status: z.string(),
    reconciliationStatus: z.string(),
    totalDebits: z.string(),
    totalCredits: z.string(),
    lineCount: z.number(),
    provisional: z.boolean(),
  }).nullable(),
  checks: z.array(periodReconCheckContract),
  overallOk: z.boolean(),
  blockerCount: z.number(),
  warningCount: z.number(),
});

export type JournalBatchSummary = z.infer<typeof journalBatchSummaryContract>;
export type JournalBatchStatus = JournalBatchSummary["status"];
export type JournalBatchDetail = z.infer<typeof journalBatchDetailContract>;
export type JournalBatchList = z.infer<typeof journalBatchListContract>;
export type PeriodReconciliationReport = z.infer<typeof periodReconciliationReportContract>;
