import { z } from "zod";
import { managerRefContract } from "@/hooks/api/hr/reporting-lines-schema";

/** Mirrors backend `dto/reporting-lines-bulk.schemas.ts` (CONTRACT §4.17–§4.19). */

export const BULK_REASSIGNMENT_ROW_CAP = 500;
export const CONFIRMATION_THRESHOLD = 10;

export const bulkJobStatusContract = z.enum(["PREVIEWED", "COMMITTING", "COMMITTED", "FAILED", "EXPIRED"]);
export const bulkJobRowStatusContract = z.enum(["READY", "WARNING", "ERROR", "SKIPPED", "COMMITTED", "FAILED"]);

export const bulkJobRowContract = z.object({
  rowNumber: z.number().int(),
  employeeEmail: z.string(),
  employee: managerRefContract.nullable(),
  currentPrimary: managerRefContract.nullable(),
  requestedPrimary: managerRefContract.nullable(),
  secondaryChanges: z.array(z.string()),
  changesLast24h: z.number().int(),
  requiresRowReason: z.boolean(),
  status: bulkJobRowStatusContract,
  codes: z.array(z.string()),
  message: z.string().nullable(),
});

export const bulkJobSummaryContract = z.object({
  jobId: z.string(),
  status: bulkJobStatusContract,
  jobReason: z.string(),
  rowCount: z.number().int(),
  readyCount: z.number().int(),
  warningCount: z.number().int(),
  errorCount: z.number().int(),
  committedCount: z.number().int(),
  requiresConfirmation: z.boolean(),
  confirmationPhrase: z.string().nullable(),
  createdAt: z.string(),
  committedAt: z.string().nullable(),
});

export const bulkJobContract = bulkJobSummaryContract.extend({
  rows: z.array(bulkJobRowContract),
  nextRowCursor: z.string().nullable(),
});

export const bulkJobPageContract = z.object({
  items: z.array(bulkJobSummaryContract),
  nextCursor: z.string().nullable(),
});

export type BulkJobRow = z.infer<typeof bulkJobRowContract>;
export type BulkJobSummary = z.infer<typeof bulkJobSummaryContract>;
export type BulkJob = z.infer<typeof bulkJobContract>;
export type BulkJobPage = z.infer<typeof bulkJobPageContract>;

export interface BulkReassignmentRowInput {
  employeeEmail: string;
  primaryManagerEmail?: string;
  secondaryManagerEmail1?: string;
  secondaryManagerEmail2?: string;
  secondaryManagerEmail3?: string;
  effectiveFrom?: string;
  reason?: string;
}

export type CreateBulkJobInput =
  | { jobReason: string; effectiveFrom?: string; rows: BulkReassignmentRowInput[] }
  | { jobReason: string; effectiveFrom?: string; employeeUserIds: string[]; primaryManagerUserId: string };

export interface CommitBulkJobInput {
  confirmationPhrase?: string;
  rowReasons?: Array<{ rowNumber: number; reason: string }>;
}
