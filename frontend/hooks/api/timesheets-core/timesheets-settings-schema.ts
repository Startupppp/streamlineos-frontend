import { z } from "zod";

export const timesheetSettingsContract = z.object({
  id: z.number(),
  orgId: z.string(),
  workWeekStart: z.number(),
  requiredFields: z.array(z.string()).nullable(),
  roundingRule: z.enum(["NONE", "NEAREST_5", "NEAREST_6", "NEAREST_10", "NEAREST_15", "ROUND_UP", "ROUND_DOWN"]),
  maxHoursPerDay: z.string(),
  allowOverlappingEntries: z.boolean(),
  allowBackdatedEntries: z.boolean(),
  backdateLimitDays: z.number().nullable(),
  approvalMode: z.enum(["MANAGER", "AUTO", "MULTI_LEVEL"]),
  clientApprovalEnabled: z.boolean(),
  lockAfterApproval: z.boolean(),
  lockAfterInvoice: z.boolean(),
  reminderRules: z.unknown().nullable(),
  payPeriod: z.string(),
  allowFutureEntries: z.boolean(),
  expectedDailyHours: z.string().nullable(),
  expectedWeeklyHours: z.string().nullable(),
  submissionGraceDays: z.number().nullable(),
  overtimeDailyHours: z.string(),
  overtimeWeeklyHours: z.string(),
  includeNonBillable: z.boolean(),
  payrollMapping: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settingsHistoryListResponseContract = z.array(
  z.object({
    id: z.number(),
    orgId: z.string(),
    version: z.number(),
    settings: z.unknown(),
    changedByMembershipId: z.number().nullable(),
    changeReason: z.string().nullable(),
    createdAt: z.string(),
  }),
);
