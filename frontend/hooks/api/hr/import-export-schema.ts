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
  entity: z.string(),
  fileName: z.string(),
  status: z.string(),
  totalRows: z.number().int(),
  validRows: z.number().int(),
  errorRows: z.number().int(),
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
  status: z.string(),
  error: z.string().nullable(),
  createdRecordRef: z.unknown().nullable(),
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

export const hrImportJobDetailContract = z.object({
  job: hrImportJobRowContract,
  errorRows: z.array(hrImportRowContract),
});

export const hrExportJobContract = z.object({
  id: z.string(),
  entity: z.string(),
  status: z.string(),
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
