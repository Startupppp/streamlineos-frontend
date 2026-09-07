import { z } from "zod";

export const runExceptionContract = z.object({
  id: z.number(),
  runId: z.number(),
  runEmployeeId: z.number().nullable(),
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

export const runExceptionsListContract = z.array(runExceptionContract);

export const resolveExceptionResponseContract = z.object({ ok: z.boolean() });

export type RunException = z.infer<typeof runExceptionContract>;
