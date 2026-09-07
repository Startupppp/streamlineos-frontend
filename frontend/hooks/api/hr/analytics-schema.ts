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
  payroll: z.object({ totalCostYTD: z.string() }),
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

export const hrCommandCenterContract = z.object({
  headcount: z.object({
    total: z.number(),
    active: z.number(),
    probation: z.number(),
    notice: z.number(),
  }),
  attritionRate12mo: z.number(),
  avgTenureMonths: z.number(),
  leaveUtilizationPct: z.number(),
  attendanceRatePct: z.number(),
  openCasesCount: z.number(),
  avgMood: z.number().nullable(),
  payrollCostLastMonth: z.number().nullable(),
});

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
  monthly: z.array(z.object({ month: z.string(), grossTotal: z.number() })),
});

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
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
