import { z } from "zod";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const importErrorContract = z.object({
  row: z.number().int(),
  field: z.string().optional(),
  message: z.string(),
});

export const hrImportJobRowContract = z.object({
  id: z.string(),
  orgId: z.string(),
  entity: z.enum(["employees", "leave_balances", "attendance", "assets", "document_metadata"]),
  fileName: z.string(),
  status: z.enum(["validating", "previewed", "committing", "committed", "rolled_back", "failed"]),
  totalRows: z.number().int(),
  validRows: z.number().int(),
  errorRows: z.number().int(),
  createdRows: z.number().int(),
  updatedRows: z.number().int(),
  unchangedRows: z.number().int(),
  errors: z.array(importErrorContract).nullable(),
  createdBy: z.string().nullable(),
  committedAt: z.string().nullable(),
  rolledBackAt: z.string().nullable(),
  createdAt: z.string(),
});

const hrImportRowContract = z.object({
  id: z.string(),
  orgId: z.string(),
  jobId: z.string(),
  rowNumber: z.number().int(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["valid", "error", "committed"]),
  error: z.string().nullable(),
  createdRecordRef: z.custom<{ table: string; id: string | number } | null>((v) => true),
});

export const hrImportJobCreateResultContract = z.object({
  job: hrImportJobRowContract,
  summary: z.object({
    total: z.number().int(),
    valid: z.number().int(),
    errors: z.number().int(),
    topErrors: z.array(importErrorContract),
  }),
});

export const hrImportJobListContract = z.object({
  data: z.array(hrImportJobRowContract),
  total: z.number().int(),
  pagination: cursorPagination,
});

export const hrImportJobDetailContract = z.custom<{
  job: z.infer<typeof hrImportJobRowContract>;
  errorRows: z.infer<typeof hrImportRowContract>[];
}>((v) => typeof v === "object" && v !== null);

export const hrExportJobContract = z.object({
  id: z.string(),
  entity: z.literal("employees"),
  status: z.enum(["pending", "running", "completed", "failed", "expired"]),
  processedRows: z.number().int(),
  rowCount: z.number().int().nullable(),
  fileName: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});
