"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

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
  payroll: { totalCostYTD: string };
  expenses: { approvedYTD: string };
  joiningExitsTrend: { month: string; joins: number; exits: number }[];
}

export function useHrAnalytics() {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "analytics"] as const,
    queryFn: ({ signal }) => apiClient.get<HrAnalyticsData>("/hr/analytics", undefined, signal),
    staleTime: 60_000,
    enabled: canAnalytics,
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
    queryKey: [...humanResourcesQueryKeys.hr.all, "analyticsAttendance", year, month] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttendanceAnalytics>("/hr/analytics/attendance", {
        year: String(year),
        month: String(month),
      }, signal),
    staleTime: 60_000,
    enabled: canAnalytics,
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
    queryKey: [...humanResourcesQueryKeys.hr.all, "analyticsAttrition"] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttritionAnalytics>("/hr/analytics/attrition", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrCommandCenterData {
  headcount: { total: number; active: number; probation: number; notice: number };
  attritionRate12mo: number;
  avgTenureMonths: number;
  leaveUtilizationPct: number;
  attendanceRatePct: number;
  openCasesCount: number;
  avgMood: number | null;
  payrollCostLastMonth: number | null;
}

export function useHrCommandCenter(departmentId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "commandCenter", departmentId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrCommandCenterData>(
        "/hr/analytics-plus",
        departmentId ? { departmentId: String(departmentId) } : undefined, signal,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrAttritionPlusData {
  joinsVsExits: { month: string; joins: number; exits: number }[];
  byDepartment: { department: string; exits: number }[];
  byReason: { reason: string; count: number }[];
}

export function useHrAttritionPlus(departmentId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "attritionPlus", departmentId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrAttritionPlusData>(
        "/hr/analytics-plus/attrition",
        departmentId ? { departmentId: String(departmentId) } : undefined, signal,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrLeaveTrendsData {
  byTypeAndMonth: { month: string; leaveTypeName: string; days: number }[];
  totalByType: { leaveTypeName: string; days: number }[];
}

interface RawLeaveTrendsRow {
  month: string;
  leave_type: string;
  days: string | number;
}

interface RawLeaveTrendsResponse {
  trends?: RawLeaveTrendsRow[];
  byTypeAndMonth?: { month: string; leaveTypeName: string; days: number }[];
  totalByType?: { leaveTypeName: string; days: number }[];
}

function normalizeLeaveTrends(raw: RawLeaveTrendsResponse): HrLeaveTrendsData {
  if (Array.isArray(raw.byTypeAndMonth)) {
    return {
      byTypeAndMonth: raw.byTypeAndMonth,
      totalByType: raw.totalByType ?? [],
    };
  }

  const rows: RawLeaveTrendsRow[] = Array.isArray(raw.trends) ? raw.trends : [];

  const byTypeAndMonth = rows.map((r) => ({
    month: String(r.month ?? ""),
    leaveTypeName: String(r.leave_type ?? ""),
    days: Number(r.days ?? 0),
  }));

  const totalsMap = new Map<string, number>();
  for (const r of byTypeAndMonth) {
    totalsMap.set(r.leaveTypeName, (totalsMap.get(r.leaveTypeName) ?? 0) + r.days);
  }
  const totalByType = Array.from(totalsMap.entries()).map(([leaveTypeName, days]) => ({
    leaveTypeName,
    days,
  }));

  return { byTypeAndMonth, totalByType };
}

export function useHrLeaveTrends(departmentId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "leaveTrends", departmentId] as const,
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawLeaveTrendsResponse>(
        "/hr/analytics-plus/leave-trends",
        departmentId ? { departmentId: String(departmentId) } : undefined, signal,
      );
      return normalizeLeaveTrends(raw);
    },
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrPayrollCostData {
  monthly: { month: string; grossTotal: number }[];
}

export function useHrPayrollCost(options?: { enabled?: boolean }) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "payrollCost"] as const,
    queryFn: ({ signal }) => apiClient.get<HrPayrollCostData>("/hr/analytics-plus/payroll-cost", undefined, signal),
    staleTime: 10 * 60_000,
    enabled: canAnalytics && (options?.enabled ?? true),
  });
}

export interface HrEngagementData {
  moodByMonth: { month: string; avgMood: number }[];
}

export function useHrEngagement() {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "engagement"] as const,
    queryFn: ({ signal }) => apiClient.get<HrEngagementData>("/hr/analytics-plus/engagement", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrPerformanceDistData {
  distribution: { rating: number; count: number }[];
}

export function useHrPerformanceDist(cycleId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "performanceDist", cycleId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrPerformanceDistData>(
        "/hr/analytics-plus/performance-distribution",
        cycleId ? { cycleId: String(cycleId) } : undefined, signal,
      ),
    staleTime: 10 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrComplianceGapsData {
  openCases: { category: string; count: number }[];
}

export function useHrComplianceGaps(departmentId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "complianceGaps", departmentId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrComplianceGapsData>(
        "/hr/analytics-plus/compliance-gaps",
        departmentId ? { departmentId: String(departmentId) } : undefined, signal,
      ),
    staleTime: 5 * 60_000,
    enabled: canAnalytics,
  });
}

export interface HrDrilldownData {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

export function useHrDrilldown(metric: string, page: number, departmentId?: number) {
  const canAnalytics = useCan("hr:analytics:read");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "drilldown", metric, page, departmentId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrDrilldownData>("/hr/analytics-plus/drilldown", {
        metric,
        page: String(page),
        limit: "20",
        ...(departmentId ? { departmentId: String(departmentId) } : {}),
      }, signal),
    staleTime: 60_000,
    enabled: canAnalytics && !!metric,
  });
}
