"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
}

export function useHrAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "analytics"] as const,
    queryFn: () => apiClient.get<HrAnalyticsData>("/hr/analytics"),
    staleTime: 60_000,
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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "analyticsAttendance", year, month] as const,
    queryFn: () =>
      apiClient.get<HrAttendanceAnalytics>("/hr/analytics/attendance", {
        year: String(year),
        month: String(month),
      }),
    staleTime: 60_000,
  });
}

export interface HrAttritionAnalytics {
  totalEmployees: number;
  resignedThisYear: number;
  attritionRatePercent: string;
  byMonth: { month: string; count: number }[];
}

export function useHrAttritionAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "analyticsAttrition"] as const,
    queryFn: () =>
      apiClient.get<HrAttritionAnalytics>("/hr/analytics/attrition"),
    staleTime: 5 * 60_000,
  });
}
