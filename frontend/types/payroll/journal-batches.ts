import type { z } from "zod";
import type { journalBatchSummaryContract } from "@/hooks/api/payroll/journal-batches-schema";
export type JournalBatchStatus = "DRAFT" | "POSTED" | "EXPORTED" | "REVERSED" | "FAILED";
export type JournalReconStatus = "UNRECONCILED" | "RECONCILED" | "DISPUTED";

export interface JournalBatchLine {
  lineNo: number;
  account: string;
  description: string;
  debit: string;
  credit: string;
  costCenter: string | null;
}

export type JournalBatch = z.infer<typeof journalBatchSummaryContract>;



export interface JournalBatchDetail extends JournalBatch {
  lines: JournalBatchLine[];
}

export interface PaginatedJournalBatches {
  data: JournalBatch[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateJournalBatchInput {
  periodKey: string;
  allowProvisional?: boolean;
  note?: string;
}

export interface PeriodReconCheck {
  key: string;
  label: string;
  ok: boolean;
  severity: "blocker" | "warning" | "info";
  detail: string;
  expected?: string;
  actual?: string;
  delta?: string;
}

export interface PeriodReconciliationReport {
  periodKey: string;
  mode: "export_manual";
  honestyNote: string;
  run: {
    id: number;
    status: string;
    netTotal: string;
    grossTotal: string;
    employeeCount: number | null;
  } | null;
  payout: {
    batchCount: number;
    totalPaid: string;
    totalPending: string;
    totalFailed: string;
    batches: {
      id: number;
      batchNumber: string;
      status: string;
      totalAmount: string;
      itemCount: number;
    }[];
  };
  journal: {
    batchId: number;
    version: number;
    status: string;
    reconciliationStatus: string;
    totalDebits: string;
    totalCredits: string;
    lineCount: number;
    provisional: boolean;
  } | null;
  checks: PeriodReconCheck[];
  overallOk: boolean;
  blockerCount: number;
  warningCount: number;
}
