import { z } from "zod";

export const importExpensesResultContract = z.object({
  success: z.literal(true),
  count: z.number(),
  skipped: z.number(),
  skippedReasons: z.array(z.object({ row: z.number(), reason: z.string() })),
  warning: z.string().optional(),
});
