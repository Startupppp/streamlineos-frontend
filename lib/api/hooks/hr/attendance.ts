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

// ─── Attendance ───────────────────────────────────────────────────────────────

export function useHrAttendanceStatus(
  options?: Omit<import("@tanstack/react-query").UseQueryOptions<AttendanceStatusResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
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
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useHrCheckOut(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-out"),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useHrToggleBreak(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/break"),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

// ─── Monthly Attendance ───────────────────────────────────────────────────────

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

// ─── Work Logs ────────────────────────────────────────────────────────────────

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;

  return useQuery({
    queryKey: queryKeys.hr.workLogs(params),
    queryFn: () => apiClient.get<WorkLog[]>("/hr/work-logs", params),
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
