import { z } from "zod";

export const hrAnalyticsOverviewContract = z.object({
  headcount: z.object({
    total: z.number(),
    active: z.number(),
    newThisMonth: z.number(),
  }),
  departments: z.array(z.object({ name: z.string(), count: z.number() })),
  gender: z.array(z.object({ gender: z.string(), count: z.number() })),
  roles: z.array(z.object({ role: z.string(), count: z.number() })),
  attendance: z.object({ totalLogsThisMonth: z.number() }),
  leaves: z.object({
    byStatus: z.record(z.string(), z.number()),
    byMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  }),
  expenses: z.object({ approvedYTD: z.string() }),
  joiningExitsTrend: z.array(z.object({ month: z.string(), joins: z.number(), exits: z.number() })),
});

export const hrAttendanceAnalyticsContract = z.object({
  year: z.number(),
  month: z.number(),
  totalAttendanceLogs: z.number(),
  byDepartment: z.array(z.object({ department: z.string(), count: z.number() })),
  daily: z.array(z.object({ date: z.string(), count: z.number() })),
});

export const hrAttritionContract = z.object({
  totalEmployees: z.number(),
  resignedThisYear: z.number(),
  attritionRatePercent: z.string(),
  byMonth: z.array(z.object({ month: z.string(), count: z.number() })),
});

const insightPeriodContract = z.object({
  range: z.enum(["month", "quarter", "year"]),
  start: z.iso.date(),
  end: z.iso.date(),
});

const insightMetricContract = <T extends z.ZodType>(value: T) => z.object({
  value: value.nullable(),
  unit: z.enum(["count", "percent", "months", "score"]),
  window: z.enum(["selected-period", "current"]),
  sensitivity: z.literal("internal"),
  coverage: z.enum(["complete", "unavailable"]),
  period: z.object({ start: z.iso.date(), end: z.iso.date() }).nullable(),
});

export const hrCommandCenterContract = z.object({
  schemaVersion: z.literal(2),
  definitionVersion: z.string(),
  asOf: z.iso.datetime(),
  scope: z.object({
    departmentId: z.string().nullable(),
    period: insightPeriodContract,
  }),
  metrics: z.object({
    headcount: insightMetricContract(z.object({
      total: z.number().int(),
      active: z.number().int(),
      probation: z.number().int(),
      notice: z.number().int(),
    })),
    attritionRate: insightMetricContract(z.number()),
    avgTenureMonths: insightMetricContract(z.number()),
    leaveUtilizationPct: insightMetricContract(z.number()),
    attendanceRatePct: insightMetricContract(z.number()),
    openCasesCount: insightMetricContract(z.number().int()),
    avgMood: insightMetricContract(z.number()),
  }),
});

export type HrCommandCenterData = z.infer<typeof hrCommandCenterContract>;

export const hrAttritionPlusContract = z.object({
  joinsVsExits: z.array(z.object({ month: z.string(), joins: z.number(), exits: z.number() })),
  byDepartment: z.array(z.object({ department: z.string(), exits: z.number() })),
  byReason: z.array(z.object({ reason: z.string(), count: z.number() })),
});

export const hrLeaveTrendsContract = z.object({
  trends: z.array(z.object({
    month: z.unknown().nullable(),
    leave_type: z.unknown().nullable(),
    days: z.unknown().nullable(),
  })),
});

export const hrPayrollCostContract = z.object({
  schemaVersion: z.literal(1),
  currency: z.literal("INR"),
  window: z.literal("trailing-12-months"),
  contributingStatuses: z.array(z.string()),
  coverage: z.enum(["complete", "partial"]),
  excludedRuns: z.array(z.object({ runId: z.number().int(), month: z.string(), status: z.string() })),
  monthly: z.array(z.object({ month: z.string(), grossTotal: z.string().regex(/^-?\d+\.\d{2}$/), runCount: z.number().int() })),
});

export type HrPayrollCostData = z.infer<typeof hrPayrollCostContract>;

export const hrEngagementContract = z.object({
  moodByMonth: z.array(z.object({ month: z.string(), avgMood: z.number() })),
});

export const hrPerformanceDistContract = z.object({
  distribution: z.array(z.object({ rating: z.number(), count: z.number() })),
});

export const hrComplianceGapsContract = z.object({
  openCases: z.array(z.object({ category: z.string(), count: z.number() })),
});

export const hrDrilldownContract = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
