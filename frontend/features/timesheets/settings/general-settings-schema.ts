import { z } from "zod";

export const generalSettingsSchema = z.object({
  workWeekStart: z.string(),
  maxHoursPerDay: z.string().min(1),
  allowOverlappingEntries: z.boolean(),
  allowBackdatedEntries: z.boolean(),
  backdateLimitDays: z.string(),
  roundingRule: z.enum([
    "NONE",
    "NEAREST_5",
    "NEAREST_6",
    "NEAREST_10",
    "NEAREST_15",
    "ROUND_UP",
    "ROUND_DOWN",
  ]),
  requiredFields: z.array(z.string()),
  approvalMode: z.enum(["MANAGER", "AUTO", "MULTI_LEVEL"]),
  clientApprovalEnabled: z.boolean(),
  lockAfterApproval: z.boolean(),
  lockAfterInvoice: z.boolean(),
  allowFutureEntries: z.boolean(),
  expectedDailyHours: z.string(),
  expectedWeeklyHours: z.string(),
  submissionGraceDays: z.string(),
});

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;
