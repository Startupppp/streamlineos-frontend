import { z } from "zod";

/** `filedSubjectRequestSchema` — the record, never the exported rows. */
const filedSubjectRequestContract = z.object({
  subjectRequestId: z.string(),
  kind: z.string(),
  subjectEmail: z.string(),
  isComplete: z.boolean(),
  totalRecordsAffected: z.number().int(),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
  dueBy: z.string().nullable(),
});
export type FiledSubjectRequest = z.infer<typeof filedSubjectRequestContract>;

export const subjectRequestListContract = z.object({ data: z.array(filedSubjectRequestContract) });
export type SubjectRequestList = z.infer<typeof subjectRequestListContract>;

const regionOutcome = z.object({
  region: z.string(),
  status: z.enum(["completed", "failed"]),
  recordsAffected: z.number().int(),
  at: z.string(),
  error: z.string().optional(),
});

const tableOutcome = z.object({
  table: z.string(),
  disposition: z.enum(["erase", "retain", "undeclared"]),
  status: z.enum(["scanned", "absent", "not-identifiable"]),
  rowsMatched: z.number().int(),
  rowsErased: z.number().int(),
  truncated: z.boolean().optional(),
});

/**
 * `executeSubjectRequestResponseSchema`. `data` is the export payload: undeclared upstream
 * because its shape is whatever the plan matched, so it is read here as opaque JSON.
 */
export const executeSubjectRequestContract = z.object({
  subjectRequestId: z.string(),
  data: z.unknown().optional(),
  result: z.object({
    kind: z.enum(["erasure", "export"]),
    subjectEmail: z.string(),
    regions: z.array(regionOutcome),
    complete: z.boolean(),
    totalRecordsAffected: z.number().int(),
    backupsExpireBy: z.string().nullable(),
  }),
  mayReportComplete: z.boolean(),
  failureSummary: z.string().nullable(),
  tables: z.record(z.string(), z.array(tableOutcome)),
  undeclared: z.array(z.string()),
  notIdentifiable: z.array(z.string()),
});
export type ExecuteSubjectRequestResult = z.infer<typeof executeSubjectRequestContract>;
