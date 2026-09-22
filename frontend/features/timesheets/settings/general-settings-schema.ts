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
  approvalMode: z.enum(["MANAGER", "AUTO"]),
  approverSource: z.enum(["REPORTING_MANAGER", "PROJECT_MANAGER"]),
  clientApprovalEnabled: z.boolean(),
  lockAfterApproval: z.boolean(),
  lockAfterInvoice: z.boolean(),
  allowFutureEntries: z.boolean(),
  expectedDailyHours: z.string(),
  expectedWeeklyHours: z.string(),
  submissionGraceDays: z.string(),
  /**
   * Optional here and conditionally required at submit, because whether the
   * server demands it depends on the DIFF rather than on the field: a material
   * change needs a reason, pressing Save with nothing altered does not. Zod
   * bounds the length (the server caps it at 500); the requirement itself is
   * asserted against the computed changes in the form.
   */
  changeReason: z.string().max(500),
});

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;
