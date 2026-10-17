import { z } from "zod";

export const bulkImportResultContract = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(z.string()),
});

export type BulkImportResult = z.infer<typeof bulkImportResultContract>;
