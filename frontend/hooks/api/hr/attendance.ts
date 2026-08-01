"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  AttendanceStatusResult,
  AttendanceLog,
  CheckInInput,
  GetMonthlyAttendanceInput,
  WorkLog,
  UpsertWorkLogInput,
  GetWorkLogsInput,
  TeamAttendanceStatusQuery,
  TeamAttendanceStatusResponse,
} from "@/types/hr";

export function useHrAttendanceStatus(
  options?: Omit<import("@tanstack/react-query").UseQueryOptions<AttendanceStatusResult, Error>, "queryKey" | "queryFn">
) {
  const canAttendance = useCan("hr:attendance:view");
  const { enabled: optEnabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
    staleTime: 2 * 60_000,
    ...restOptions,
    enabled: canAttendance && (optEnabled ?? true),
  });
}

export function useHrCheckIn(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, CheckInInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "attendance", "check-in"],
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-in", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        const nowIso = new Date().toISOString();
        const baseLog = previous.todayLog;
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "PRESENT",
          cooldownRemaining: 0,
          todayLog: baseLog
            ? {
                ...baseLog,
                checkIn: nowIso,
                checkOut: null,
                status: "PRESENT",
              }
            : {
                id: 0,
                orgId: "",
                userId: "",
                date: new Date().toLocaleDateString("en-CA"),
                checkIn: nowIso,
                checkOut: null,
                status: "PRESENT",
                workHours: null,
                breakHours: "0",
                breaks: [],
                locationData: null,
                isOvertime: false,
                autoCheckedOut: false,
                createdAt: nowIso,
              },
        });
      }
      return { previous };
    },
    onError: (err, vars, context, mutation) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.hr.attendanceStatus(), context.previous);
      }
      options?.onError?.(err, vars, context, mutation);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceLogs() });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "attendanceHeatmap"] });
    },
    onSuccess: options?.onSuccess,
  });
}

export function useHrCheckOut(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { localDate?: string }>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "attendance", "check-out"],
    mutationFn: (data: { localDate?: string }) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-out", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        const nowIso = new Date().toISOString();
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "CHECKED_OUT",
          todayLog: previous.todayLog
            ? {
                ...previous.todayLog,
                checkOut: nowIso,
                status: "CHECKED_OUT",
              }
            : previous.todayLog,
        });
      }
      return { previous };
    },
    onError: (err, vars, context, mutation) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.hr.attendanceStatus(), context.previous);
      }
      options?.onError?.(err, vars, context, mutation);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceLogs() });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "attendanceHeatmap"] });
    },
    onSuccess: options?.onSuccess,
  });
}

export function useHrToggleBreak(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "attendance", "toggle-break"],
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
  const canAttendance = useCan("hr:attendance:view");
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", params as unknown as Record<string, unknown>),
    staleTime: 2 * 60_000,
    enabled: canAttendance && !!params.userId,
  });
}

export function useAttendanceHeatmap(params: { userId: string; year: number }) {
  const canAttendance = useCan("hr:attendance:view");
  return useQuery({
    queryKey: queryKeys.hr.attendanceHeatmap(params),
    queryFn: () =>
      apiClient.get<{
        year: number;
        userId: string;
        heatmap: { date: string; hours: number; sessions: number; intensity: number }[];
        summary: { totalDays: number; totalHours: string; avgHoursPerDay: string; longestStreak: number };
      }>("/hr/attendance/heatmap", params as unknown as Record<string, unknown>),
    staleTime: 2 * 60_000,
    enabled: canAttendance && !!params.userId,
  });
}

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const canAttendance = useCan("hr:attendance:view");
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;
  if (input.month !== undefined) params.month = input.month;
  if (input.dateFrom) params.dateFrom = input.dateFrom;
  if (input.dateTo) params.dateTo = input.dateTo;

  return useQuery({
    queryKey: queryKeys.hr.workLogs(params),
    queryFn: () => apiClient.get<WorkLog[]>("/hr/work-logs", params),
    staleTime: 2 * 60_000,
    enabled: canAttendance,
  });
}

export function useUpsertWorkLog(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "work-logs", "upsert"],
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.workLogs() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useHrTeamAttendanceStatus(params?: TeamAttendanceStatusQuery) {
  const canAttendance = useCan("hr:attendance:view");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "team-attendance-status", params ?? {}] as const,
    queryFn: () =>
      apiClient.get<TeamAttendanceStatusResponse>(
        "/hr/attendance/team-status",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 65_000,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
    enabled: canAttendance,
  });
}

export interface AttendanceRegularization {
  id: number;
  orgId: string;
  userId: string;
  attendanceDate: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  workflowInstanceId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegularizationInput {
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export function useCreateRegularization(
  options?: Omit<UseMutationOptions<AttendanceRegularization, Error, CreateRegularizationInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "regularization", "create"],
    mutationFn: (data: CreateRegularizationInput) =>
      apiClient.post<AttendanceRegularization>("/hr/attendance/regularizations", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "regularizations"] });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}
