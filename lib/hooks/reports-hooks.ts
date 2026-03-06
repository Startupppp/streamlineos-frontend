import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { ReportsRouterOutputs } from "./trpc-keys";

export const useReportsAttendance = (
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getAttendanceReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getAttendanceReport"], Error>({
    queryKey: vaivammKeys.reports.attendance(userId, startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getAttendanceReport.query({
        userId,
        startDate: startDate!,
        endDate: endDate!,
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};

export const useReportsPayroll = (
  userId?: string,
  startMonth?: string,
  endMonth?: string,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getPayrollReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getPayrollReport"], Error>({
    queryKey: vaivammKeys.reports.payroll(userId, startMonth, endMonth),
    queryFn: () =>
      vaivammTrpcClient.reports.getPayrollReport.query({
        userId,
        startMonth: startMonth!,
        endMonth: endMonth!,
      }),
    enabled: !!startMonth && !!endMonth,
    ...options,
  });
};

export const useReportsProject = (
  projectId?: number,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getProjectReport"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ReportsRouterOutputs["getProjectReport"], Error>({
    queryKey: vaivammKeys.reports.project(projectId, startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getProjectReport.query({
        projectId,
        startDate,
        endDate,
      }),
    ...options,
  });
};

export const useReportsTeamPerformance = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getTeamPerformanceReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getTeamPerformanceReport"], Error>({
    queryKey: vaivammKeys.reports.teamPerformance(startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getTeamPerformanceReport.query({
        startDate: startDate!,
        endDate: endDate!,
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};

export const useReportsDashboardStats = (
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getDashboardStats"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ReportsRouterOutputs["getDashboardStats"], Error>({
    queryKey: vaivammKeys.reports.dashboardStats(),
    queryFn: () => vaivammTrpcClient.reports.getDashboardStats.query(),
    ...options,
  });
};
