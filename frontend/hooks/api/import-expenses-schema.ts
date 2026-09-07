import { z } from "zod";

export const importExpensesResultContract = z.object({
  success: z.boolean(),
  count: z.number().optional(),
  skipped: z.number().optional(),
  skippedReasons: z.array(z.object({ row: z.number(), reason: z.string() })).optional(),
  error: z.string().optional(),
});

export type ImportExpensesResult = z.infer<typeof importExpensesResultContract>;
