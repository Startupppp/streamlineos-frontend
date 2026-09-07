import { z } from "zod";

export const bulkImportResultContract = z.object({
  imported: z.number().int(),
  updated: z.number().int(),
  errors: z.array(z.unknown()),
  skipped: z.number().int().optional(),
  duplicatesFound: z.number().int().optional(),
  distributed: z.number().int().optional(),
  salesPeopleCount: z.number().int().optional(),
});
