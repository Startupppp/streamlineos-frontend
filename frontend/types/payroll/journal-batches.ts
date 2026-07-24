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

export interface JournalBatch {
  id: number;
  periodKey: string;
  version: number;
  status: JournalBatchStatus;
  reconciliationStatus: JournalReconStatus;
  reversalOfBatchId: number | null;
  provisional: boolean;
  totalDebits: string;
  totalCredits: string;
  lineCount: number;
  unmappedCodes: string[];
  runId: number | null;
  note: string | null;
  reversalReason: string | null;
  reconciliationNote: string | null;
  postedAt: string | null;
  exportedAt: string | null;
  reversedAt: string | null;
  reconciledAt: string | null;
  createdAt: string;
}

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
