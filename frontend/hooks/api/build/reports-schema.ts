import { z } from "zod";
import {
  projectsReportsVelocityResponseSchema,
  projectsReportsBurnupResponseSchema,
  projectsReportsCfdResponseSchema,
  projectsReportsCriticalPathResponseSchema,
  projectsReportsGetCycleTimeResponseSchema,
  projectsReportsGetLeadTimeResponseSchema,
  projectsReportsSnapshotResponseSchema,
} from "@/contracts/build-contracts.generated";

export const velocityContract = projectsReportsVelocityResponseSchema;
export const burnupDataContract = projectsReportsBurnupResponseSchema;
export const cfdDataContract = projectsReportsCfdResponseSchema;
export const criticalPathContract = projectsReportsCriticalPathResponseSchema;
export const cycleTimeContract = projectsReportsGetCycleTimeResponseSchema;
export const leadTimeContract = projectsReportsGetLeadTimeResponseSchema;

export const snapshotResultContract = projectsReportsSnapshotResponseSchema;

const timesheetCostEntryContract = z.object({
  currency: z.string().nullable(),
  costMinor: z.number().int().nonnegative(),
  rateSources: z.array(z.string()),
});

export const timeBudgetContract = z.object({
  loggedHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative(),
  nonBillableHours: z.number().nonnegative(),
  costEntries: z.array(timesheetCostEntryContract),
  includedStatus: z.array(z.string()),
  glExpenseDebitMinor: z.number().nonnegative(),
  glFunctionalCurrency: z.string().nullable(),
  estimateBudgetMinor: z.number().nonnegative().nullable(),
  budgetCurrency: z.string().nullable(),
  varianceMinor: z.number().nullable(),
  reconciliationStatus: z.enum(["unstarted", "gl_pending", "matched", "unmatched", "currency_mismatch"]),
});

export type TimeBudgetData = z.infer<typeof timeBudgetContract>;
