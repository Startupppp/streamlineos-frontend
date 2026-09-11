import { z } from "zod";
import { entryContract } from "@/hooks/api/timesheets-core/timesheets-entry-schema";

export const timeEntryRowContract = entryContract.omit({ approvedBy: true, project: true, ticket: true }).extend({
  approvedByMembershipId: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
  costRate: z.string().nullable(),
  payrollStatus: z.string().nullable(),
  payrollExportId: z.number().int().nullable(),
  timerSessionId: z.number().int().nullable(),
  lockedByMembershipId: z.number().int().nullable(),
  voidReason: z.string().nullable(),
});
