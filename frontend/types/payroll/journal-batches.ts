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

