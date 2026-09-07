import { z } from "zod";

export const kbImportJobContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  sourceType: z.string(),
  fileKey: z.string().nullable(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  totalItems: z.number().int(),
  processedItems: z.number().int(),
  succeededItems: z.number().int(),
  failedItems: z.number().int(),
  duplicateItems: z.number().int(),
  errorReport: z.record(z.string(), z.unknown()).nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbImportJobListContract = z.array(kbImportJobContract);

export const kbExportJobContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  scopeType: z.string(),
  scopeId: z.number().int().nullable(),
  format: z.enum(["markdown", "html"]),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  fileKey: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbExportJobListContract = z.array(kbExportJobContract);

export const kbImportResultContract = z.object({
  jobId: z.number().int(),
  succeeded: z.number().int(),
  failed: z.number().int(),
  total: z.number().int(),
});

export const kbMigrationPreviewContract = z.object({
  total: z.number().int(),
  byStatus: z.record(z.string(), z.number().int()),
  alreadyMigrated: z.number().int(),
  willMigrate: z.number().int(),
  sample: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      visibility: z.string(),
    }),
  ),
});

export const kbMigrationRunContract = z.object({
  migrated: z.number().int(),
  skipped: z.number().int(),
  total: z.number().int(),
  dryRun: z.boolean(),
  jobId: z.number().int().optional(),
  failed: z.number().int(),
  failedArticleIds: z.array(z.number().int()).optional(),
});

export const kbFromTicketSuccessContract = z.object({ success: z.boolean() });

export const kbMediaUploadContract = z.object({
  key: z.string(),
  size: z.number().int(),
  mimeType: z.string(),
  sha256: z.string(),
  name: z.string(),
});
