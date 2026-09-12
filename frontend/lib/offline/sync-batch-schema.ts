import { z } from "zod";

export const syncOperationResultContract = z.object({
  clientOperationId: z.string(),
  outcome: z.enum(["applied", "duplicate", "conflict", "failed"]),
  reason: z.string().optional(),
  code: z.string().optional(),
});

export const syncBatchResultContract = z.object({
  applied: z.number().int(),
  duplicates: z.number().int(),
  conflicts: z.number().int(),
  failures: z.number().int(),
  results: z.array(syncOperationResultContract),
});
