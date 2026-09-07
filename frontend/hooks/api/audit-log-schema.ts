import { z } from "zod";

/**
 * Contracts for `AuditLogController` handlers.
 *
 * The audit log uses `pageInfo` with `nextCursor` (cursor-based) under the
 * `pagination` key — matched here against the backend's `auditLogListSchema`.
 *
 * Timestamps are ISO strings over JSON.
 * NOT `.strict()`: extra response fields are backward-compatible.
 */

const auditLogItemContract = z.object({
  id: z.number(),
  action: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
  targetId: z.string().nullable(),
  targetType: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const auditLogListContract = z.object({
  logs: z.array(auditLogItemContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const auditLogActionsContract = z.array(z.string());

export const auditLogTargetTypesContract = z.array(z.string());
