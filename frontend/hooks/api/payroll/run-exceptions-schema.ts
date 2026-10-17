import { z } from "zod";

export const runExceptionContract = z.object({
  id: z.number(),
  code: z.string(),
  severity: z.enum(["BLOCKER", "WARNING", "INFO"]),
  status: z.enum(["OPEN", "RESOLVED", "OVERRIDDEN"]),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  userId: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  overrideReason: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const runExceptionsPageContract = z.object({
  data: z.array(runExceptionContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    total: z.number().int(),
  }),
});

export const resolveExceptionResponseContract = z.object({ ok: z.boolean() });

export type RunException = z.infer<typeof runExceptionContract>;
export type RunExceptionsPage = z.infer<typeof runExceptionsPageContract>;
