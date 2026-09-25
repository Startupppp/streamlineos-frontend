import { z } from "zod";

const count = z.number().int().nonnegative();

export const documentBackfillContract = z.object({
  dryRun: z.boolean(),
  scanned: count,
  eligible: count,
  proposals: z.object({ allEmployees: count, hrOnly: count }),
  skipped: z.object({
    alreadyClassified: count,
    belongsToAnEmployee: count,
    typeNotAllowed: count,
    hiringArtefact: count,
    inactive: count,
  }),
  applied: count,
  nextCursor: z.number().int().nullable(),
  done: z.boolean(),
  sample: z.array(z.object({ documentId: z.number().int(), name: z.string(), audience: z.enum(["ALL_EMPLOYEES", "HR_ONLY"]) })),
});
