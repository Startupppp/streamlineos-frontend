import { z } from "zod";

export const importProgressContract = z.object({
  crmImportId: z.string(),
  status: z.string(),
  workflowRunId: z.string().nullable(),
  runStatus: z.string().nullable(),
  complete: z.boolean(),
  total: z.number().int(),
  remaining: z.number().int(),
  created: z.number().int(),
  updated: z.number().int(),
  merged: z.number().int(),
  review: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int(),
  reverted: z.number().int(),
  revertDeadlineAt: z.string().nullable(),
});

export const importPreviewContract = z.record(z.string(), z.unknown());

const importRowSchema = z.object({
  crmImportRowId: z.string(),
  organizationId: z.string(),
  crmImportId: z.string(),
  rowNumber: z.number().int(),
  action: z.string(),
  reason: z.string().nullable(),
  values: z.record(z.string(), z.unknown()).nullable(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  matchedRecordId: z.string().nullable(),
  duplicateOfRow: z.number().int().nullable(),
  match: z.unknown().nullable(),
});

export const importRecordContract = z.object({
  crmImportId: z.string(),
  organizationId: z.string(),
  status: z.string(),
  sourceFilename: z.string().nullable(),
  targetEntity: z.string(),
  targetSubjectTypeId: z.string().nullable(),
  columns: z.unknown().nullable(),
  summary: z.unknown().nullable(),
  workflowRunId: z.string().nullable(),
  revertWorkflowRunId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  committedAt: z.string().nullable(),
  revertDeadlineAt: z.string().nullable(),
  revertedAt: z.string().nullable(),
  revertedByUserId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rows: z.array(importRowSchema),
});

export const connectorProgressContract = z.object({
  crmConnectorSyncId: z.string(),
  provider: z.string(),
  stream: z.string(),
  enabled: z.boolean(),
  syncedThrough: z.string().nullable(),
  resuming: z.boolean(),
  staged: z.number().int(),
  crmImportId: z.string().nullable(),
  workflowRunId: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  lastError: z.string().nullable(),
  consecutiveFailures: z.number().int(),
});
