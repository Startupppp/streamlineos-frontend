import { z } from "zod";

export const bulkImportResultContract = z.object({
  imported: z.number().int().optional(),
  created: z.number().int().optional(),
  updated: z.number().int().optional(),
  skipped: z.number().int().optional(),
  failed: z.number().int().optional(),
  duplicatesFound: z.number().int().optional(),
  distributed: z.number().int().optional(),
  salesPeopleCount: z.number().int().optional(),
  errors: z.array(z.object({ row: z.number().int(), message: z.string() })).optional(),
});
