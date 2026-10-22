import { z } from "zod";

export const gdprExportResultContract = z.object({
  exportedAt: z.string(),
  subject: z.object({
    userId: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  memberships: z.array(z.record(z.string(), z.unknown())),
  employment: z.record(z.string(), z.unknown()).nullable(),
  dataRequests: z.array(z.record(z.string(), z.unknown())),
  legalHolds: z.array(z.record(z.string(), z.unknown())),
  auditEntries: z.array(z.record(z.string(), z.unknown())),
  exportIncomplete: z.array(z.string()),
});
export type GdprExportResult = z.infer<typeof gdprExportResultContract>;

export const gdprExportJobContract = z.object({
  id: z.string(),
  status: z.string(),
  subjectUserId: z.string(),
  rowCount: z.number().int().nullable(),
  truncated: z.boolean().nullable(),
  fileName: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});
export type GdprExportJob = z.infer<typeof gdprExportJobContract>;

export const gdprRectificationContract = z.object({
  requestId: z.number().int(),
  field: z.string(),
  changed: z.boolean(),
  status: z.literal("completed"),
});
export type GdprRectificationResult = z.infer<typeof gdprRectificationContract>;

const storageWork = z.object({
  manifestSize: z.number().int(),
  purged: z.number().int().optional(),
  errors: z.number().int().optional(),
});

export const gdprErasureContract = z.discriminatedUnion("blocked", [
  z.object({
    blocked: z.literal(true),
    blockReason: z.string().nullable(),
    holdId: z.string(),
    dryRun: z.boolean(),
    tablesAnonymised: z.array(z.string()),
    globalIdentityAnonymised: z.boolean(),
    storage: storageWork,
  }),
  z.object({
    blocked: z.literal(false),
    dryRun: z.boolean(),
    tablesAnonymised: z.array(z.string()),
    globalIdentityAnonymised: z.boolean(),
    storage: storageWork,
  }),
]);
export type GdprErasureResult = z.infer<typeof gdprErasureContract>;
