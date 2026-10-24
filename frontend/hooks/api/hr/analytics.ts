"use client";

import {
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useScope } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { hrAnalyticsQueryOptions } from "@/hooks/api/hr/analytics-read-options";
import {
  type RawLeaveTrendsResponse,
  normalizeLeaveTrends,
} from "./analytics-normalize";
import type {
  HrCommandCenterData,
  HrPayrollCostData,
} from "./analytics-schema";

const hrAnalyticsOverviewC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrAnalyticsOverviewContract,
  ),
);
const hrAttendanceAnalyticsC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrAttendanceAnalyticsContract,
  ),
);
const hrAttritionC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then((m) => m.hrAttritionContract),
);
const hrCommandCenterC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrCommandCenterContract,
  ),
);
const hrAttritionPlusC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrAttritionPlusContract,
  ),
);
const hrLeaveTrendsC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrLeaveTrendsContract,
  ),
);
const hrPayrollCostC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrPayrollCostContract,
  ),
);
const hrEngagementC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then((m) => m.hrEngagementContract),
);
const hrPerformanceDistC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrPerformanceDistContract,
  ),
);
const hrComplianceGapsC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then(
    (m) => m.hrComplianceGapsContract,
  ),
);
const hrDrilldownC = lazyContract(() =>
  import("@/hooks/api/hr/analytics-schema").then((m) => m.hrDrilldownContract),
);

export interface HrAnalyticsData {
  headcount: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  departments: { name: string; count: number }[];
  gender: { gender: string; count: number }[];
  roles: { role: string; count: number }[];
  attendance: { totalLogsThisMonth: number };
  leaves: {
    byStatus: Record<string, number>;
    byMonth: { month: string; count: number }[];
  };
  expenses: { approvedYTD: string };
  joiningExitsTrend: { month: string; joins: number; exits: number }[];
}

export function useHrAnalytics() {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    ...hrAnalyticsQueryOptions(),
    queryFn: ({ signal }) =>
      apiClient.get<HrAnalyticsData>(
        "/hr/analytics",
        undefined,
        signal,
        hrAnalyticsOverviewC,
      ),
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrAttendanceAnalytics {
  year: number;
  month: number;
  totalAttendanceLogs: number;
  byDepartment: { department: string; count: number }[];
  daily: { date: string; count: number }[];
}

export function useHrAttendanceAnalytics(year: number, month: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "analyticsAttendance",
      year,
      month,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttendanceAnalytics>(
        "/hr/analytics/attendance",
        {
          year: String(year),
          month: String(month),
        },
        signal,
        hrAttendanceAnalyticsC,
      ),
    staleTime: 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrAttritionAnalytics {
  totalEmployees: number;
  resignedThisYear: number;
  attritionRatePercent: string;
  byMonth: { month: string; count: number }[];
}

export function useHrAttritionAnalytics() {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "analyticsAttrition",
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttritionAnalytics>(
        "/hr/analytics/attrition",
        undefined,
        signal,
        hrAttritionC,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export type InsightRange = "month" | "quarter" | "year";

export interface HrCommandCenterFilters {
  departmentId?: string;
  range: InsightRange;
  anchor?: string;
}

export function useHrCommandCenter(filters: HrCommandCenterFilters) {
  const canAnalytics = useCan("hr:analytics:read");
  const params = {
    departmentId: filters.departmentId ?? null,
    range: filters.range,
    anchor: filters.anchor ?? null,
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.analyticsCommandCenter(params),
    queryFn: ({ signal }) =>
      apiClient.get<HrCommandCenterData>(
        "/hr/analytics-plus",
        {
          range: params.range,
          ...(params.departmentId ? { departmentId: params.departmentId } : {}),
          ...(params.anchor ? { anchor: params.anchor } : {}),
        },
        signal,
        hrCommandCenterC,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrAttritionPlusData {
  joinsVsExits: { month: string; joins: number; exits: number }[];
  byDepartment: { department: string; exits: number }[];
  byReason: { reason: string; count: number }[];
}

export function useHrAttritionPlus(departmentId?: string) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "attritionPlus",
      departmentId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttritionPlusData>(
        "/hr/analytics-plus/attrition",
        departmentId ? { departmentId } : undefined,
        signal,
        hrAttritionPlusC,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export function useHrLeaveTrends(departmentId?: string) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "leaveTrends",
      departmentId,
    ] as const,
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawLeaveTrendsResponse>(
        "/hr/analytics-plus/leave-trends",
        departmentId ? { departmentId } : undefined,
        signal,
        hrLeaveTrendsC,
      );
      return normalizeLeaveTrends(raw);
    },
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export function useCanViewOrganizationPayrollCost(): boolean {
  const salary = useScope("hr:salary:view");
  const payroll = useScope("hr:payroll:view");
  return salary === "all" || payroll === "all";
}

export function useHrPayrollCost() {
  const canAnalytics = useCan("hr:analytics:read");
  const canViewPayrollCost = useCanViewOrganizationPayrollCost();
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.analyticsPayrollCost(),
    queryFn: ({ signal }) =>
      apiClient.get<HrPayrollCostData>(
        "/hr/analytics-plus/payroll-cost",
        undefined,
        signal,
        hrPayrollCostC,
      ),
    staleTime: 10 * 60_000,
    enabled: canAnalytics && canViewPayrollCost,
    ...INLINE_READ_ERROR,
  });
}

export interface HrEngagementData {
  moodByMonth: { month: string; avgMood: number }[];
}

export function useHrEngagement() {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "engagement"] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrEngagementData>(
        "/hr/analytics-plus/engagement",
        undefined,
        signal,
        hrEngagementC,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrPerformanceDistData {
  distribution: { rating: number; count: number }[];
}

export function useHrPerformanceDist(cycleId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "performanceDist",
      cycleId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrPerformanceDistData>(
        "/hr/analytics-plus/performance-distribution",
        cycleId ? { cycleId: String(cycleId) } : undefined,
        signal,
        hrPerformanceDistC,
      ),
    staleTime: 10 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrComplianceGapsData {
  openCases: { category: string; count: number }[];
}

export function useHrComplianceGaps(departmentId?: string) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "complianceGaps",
      departmentId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrComplianceGapsData>(
        "/hr/analytics-plus/compliance-gaps",
        departmentId ? { departmentId } : undefined,
        signal,
        hrComplianceGapsC,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
    ...INLINE_READ_ERROR,
  });
}

export interface HrDrilldownPage {
  rows: Record<string, unknown>[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useHrDrilldown(
  metric: string,
  departmentId?: string,
  limit = 20,
) {
  const canAnalytics = useCan("hr:analytics:read");
  return useInfiniteQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "drilldown",
      metric,
      departmentId,
      limit,
    ] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<HrDrilldownPage>(
        "/hr/analytics-plus/drilldown",
        {
          metric,
          limit: String(limit),
          ...(pageParam !== null ? { cursor: pageParam } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        signal,
        hrDrilldownC,
      ),
    initialPageParam: NULL_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canAnalytics && !!metric,
    ...INLINE_READ_ERROR,
  });
}
