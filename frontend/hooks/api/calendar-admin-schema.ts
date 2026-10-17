import { z } from "zod";

export const calendarExportPolicies = ["disabled", "own", "authorized"] as const;
export const calendarProviderWriteScopes = ["disabled", "calendar_events"] as const;

export const calendarAdminPolicyContract = z.object({
  version: z.number().int().nonnegative(),
  analyticsTimeZone: z.string(),
  minimumAnalyticsCohort: z.number().int().min(5),
  analyticsRetentionDays: z.number().int().positive(),
  exportPolicy: z.enum(calendarExportPolicies),
  providerWriteScope: z.enum(calendarProviderWriteScopes),
  allowedBookingDomains: z.array(z.string()),
  publicLinksEnabled: z.boolean(),
  defaultLinkExpiryDays: z.number().int().positive(),
  minimumCompletionSeconds: z.number().int().nonnegative(),
  maximumSessionAttempts: z.number().int().positive(),
  maximumActiveLinks: z.number().int().positive(),
  offlineBusyCacheEnabled: z.boolean(),
  offlineBusyCacheMaxAgeDays: z.number().int().min(1).max(30),
  updatedAt: z.string().nullable(),
});

const calendarAnalyticsMetricContract = z.object({
  key: z.enum(["bookings", "confirmed", "completed", "cancelled", "no_show_rate", "schedule_churn_rate", "routing_fallback_rate", "routing_coverage_rate", "routing_change_rate", "slot_utilization"]),
  label: z.string(),
  value: z.number().nullable(),
  unit: z.enum(["count", "percent"]),
  numerator: z.number().int().nonnegative().nullable(),
  denominator: z.number().int().nonnegative().nullable(),
  definition: z.string(),
  suppressed: z.boolean(),
});

export const calendarAnalyticsContract = z.object({
  period: z.object({
    requestedFrom: z.string(),
    effectiveFrom: z.string(),
    to: z.string(),
    timeZone: z.string(),
    retentionApplied: z.boolean(),
    availableAt: z.iso.datetime(),
  }),
  privacy: z.object({
    minimumCohort: z.number().int().min(5),
    cohortState: z.enum(["sufficient", "below_threshold", "empty", "pending", "retention_withheld"]),
    suppressed: z.boolean(),
  }),
  methodology: z.object({
    basis: z.string(),
    denominator: z.string(),
    deduplication: z.string(),
    corrections: z.string(),
    deletedRecords: z.string(),
    lateEventDefinition: z.string(),
  }),
  coverage: z.object({
    state: z.enum(["complete", "partial", "failed"]),
    expectedSources: z.array(z.string()),
    observedSources: z.array(z.string()),
    missingSources: z.array(z.string()),
    failedSources: z.array(z.string()),
    partialSources: z.array(z.string()),
  }),
  freshness: z.object({
    latestEventAt: z.string().nullable(),
    correctionEvents: z.number().int().nonnegative().nullable(),
    lateEvents: z.number().int().nonnegative().nullable(),
  }),
  metrics: z.array(calendarAnalyticsMetricContract),
});

export const calendarLinkRevocationContract = z.object({
  revokedLinks: z.number().int().nonnegative(),
  revokedAt: z.string(),
});

export type CalendarAdminPolicy = z.infer<typeof calendarAdminPolicyContract>;
export type CalendarAnalytics = z.infer<typeof calendarAnalyticsContract>;
export type CalendarExportPolicy = (typeof calendarExportPolicies)[number];
export type CalendarProviderWriteScope = (typeof calendarProviderWriteScopes)[number];
