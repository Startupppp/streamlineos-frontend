"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AttendanceStatusResult,
  AttendanceLog,
  CheckInInput,
  GetMonthlyAttendanceInput,
  WorkLog,
  UpsertWorkLogInput,
  UpdateWorkLogStatusInput,
  GetWorkLogsInput,
} from "@/types/hr";

export function useHrAttendanceStatus(
  options?: Omit<import("@tanstack/react-query").UseQueryOptions<AttendanceStatusResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
    staleTime: 2 * 60_000,
    ...options,
  });
}

export function useHrAttendanceLogs(params?: {
  userId?: string;
  year?: number;
  month?: number;
}) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceLogs(params),
    queryFn: () =>
    staleTime: 2 * 60_000,
      apiClient.get<AttendanceLog[]>("/hr/attendance/logs", params as Record<string, unknown>),
  });
}

export function useHrCheckIn(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, CheckInInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-in", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "PRESENT",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrCheckOut(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { localDate?: string }>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { localDate?: string }) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-out", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "CHECKED_OUT",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrToggleBreak(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/break"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: previous.status === "ON_BREAK" ? "PRESENT" : "ON_BREAK",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
    staleTime: 2 * 60_000,
      apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

export function useAttendanceHeatmap(params: { userId: string; year: number }) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceHeatmap(params),
    queryFn: () =>
    staleTime: 2 * 60_000,
      apiClient.get<{
        year: number;
        userId: string;
        heatmap: { date: string; hours: number; sessions: number; intensity: number }[];
        summary: { totalDays: number; totalHours: string; avgHoursPerDay: string; longestStreak: number };
      }>("/hr/attendance/heatmap", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;

  return useQuery({
    queryKey: queryKeys.hr.workLogs(params),
    queryFn: () => apiClient.get<WorkLog[]>("/hr/work-logs", params),
    staleTime: 2 * 60_000,
  });
}

export function useUpsertWorkLog(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useUpdateWorkLogStatus(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpdateWorkLogStatusInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWorkLogStatusInput) =>
      apiClient.patch<WorkLog>("/hr/work-logs/status", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}
