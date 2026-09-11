import { z } from "zod";
import { timesheetPeriodContract } from "./timesheets-period-schema";

export const teamSummaryResponseContract = z.object({
  summaries: z.array(
    z.object({
      userId: z.string(),
      period: timesheetPeriodContract.nullable(),
      dailyHours: z.record(z.string(), z.number()),
      totalHours: z.number(),
    }),
  ),
});
