"use client";

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { activeAttendancePollInterval } from "@/lib/query-request-policies";

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

export interface AttendanceHistoryResponse {
  data: AttendanceLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useHrAttendanceStatus(
  options?: Omit<
    import("@tanstack/react-query").UseQueryOptions<
      AttendanceStatusResult,
      Error
    >,
    "queryKey" | "queryFn"
  >,
) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canAttendance = useCan("self:attendance");
  const { enabled: optEnabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(orgId),
    queryFn: () =>
      apiClient.get<AttendanceStatusResult>("/me/attendance/status"),
    staleTime: 2 * 60_000,
    refetchInterval: (query) => activeAttendancePollInterval(query.state.data),
    refetchIntervalInBackground: false,
    ...restOptions,
    enabled: !!orgId && canAttendance && (optEnabled ?? true),
  });
}

export function useHrAttendanceHistory(page: number, limit: number) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canAttendance = useCan("self:attendance");
  const params = { page, limit };
  return useQuery({
    queryKey: queryKeys.hr.attendanceHistory(params),
    queryFn: async () => {
      try {
        return await apiClient.get<AttendanceHistoryResponse>(
          "/me/attendance/history",
          params,
        );
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
        const legacyData = await apiClient.get<AttendanceLog[]>(
          "/me/attendance/logs",
        );
        const offset = (page - 1) * limit;
        return {
          data: legacyData.slice(offset, offset + limit),
          pagination: {
            page,
            limit,
            total: legacyData.length,
            totalPages: Math.ceil(legacyData.length / limit),
          },
        };
      }
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: !!orgId && canAttendance,
  });
}

export function useHrCheckIn(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, CheckInInput>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const statusKey = queryKeys.hr.attendanceStatus(orgId);
  return useMutation({
    mutationKey: ["hr", "attendance", "check-in"],
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/me/attendance/check-in", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: statusKey, exact: true });
      const previous = qc.getQueryData<AttendanceStatusResult>(statusKey);
      if (previous) {
        const nowIso = new Date().toISOString();
        const baseLog = previous.todayLog;
        qc.setQueryData<AttendanceStatusResult>(statusKey, {
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
        qc.setQueryData(statusKey, context.previous);
      }
      options?.onError?.(err, vars, context, mutation);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: statusKey, exact: true });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "attendanceHistory"],
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "monthlyAttendance"],
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "attendanceHeatmap"],
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.dashboard.teamAttendance(orgId),
        exact: true,
      });
    },
    onSuccess: options?.onSuccess,
  });
}

export function useHrCheckOut(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, { localDate?: string }>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const statusKey = queryKeys.hr.attendanceStatus(orgId);
  return useMutation({
    mutationKey: ["hr", "attendance", "check-out"],
    mutationFn: (data: { localDate?: string }) =>
      apiClient.post<{ success: boolean }>("/me/attendance/check-out", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: statusKey, exact: true });
      const previous = qc.getQueryData<AttendanceStatusResult>(statusKey);
      if (previous) {
        const nowIso = new Date().toISOString();
        qc.setQueryData<AttendanceStatusResult>(statusKey, {
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
        qc.setQueryData(statusKey, context.previous);
      }
      options?.onError?.(err, vars, context, mutation);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: statusKey, exact: true });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "attendanceHistory"],
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "monthlyAttendance"],
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "attendanceHeatmap"],
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.dashboard.teamAttendance(orgId),
        exact: true,
      });
    },
    onSuccess: options?.onSuccess,
  });
}

export function useHrToggleBreak(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, void>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const statusKey = queryKeys.hr.attendanceStatus(session?.orgId ?? "");
  return useMutation({
    mutationKey: ["hr", "attendance", "toggle-break"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/me/attendance/break"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: statusKey, exact: true });
      const previous = qc.getQueryData<AttendanceStatusResult>(statusKey);
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(statusKey, {
          ...previous,
          status: previous.status === "ON_BREAK" ? "PRESENT" : "ON_BREAK",
        });
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: statusKey, exact: true });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "monthlyAttendance"],
      });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  const canSelf = useCan("self:attendance");
  const canManage = useCan("hr:attendance:view");
  const isOtherUser = params.userId !== undefined;
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>(
        isOtherUser ? "/hr/attendance/monthly" : "/me/attendance/monthly",
        {
          year: params.year,
          month: params.month,
          ...(params.userId ? { userId: params.userId } : {}),
        },
      ),
    staleTime: 2 * 60_000,
    enabled: isOtherUser ? canManage : canSelf,
  });
}

export function useAttendanceHeatmap(params: { year: number }) {
  const canAttendance = useCan("self:attendance");
  return useQuery({
    queryKey: queryKeys.hr.attendanceHeatmap(params),
    queryFn: () =>
      apiClient.get<{
        year: number;
        userId: string;
        heatmap: {
          date: string;
          hours: number;
          sessions: number;
          intensity: number;
        }[];
        summary: {
          totalDays: number;
          totalHours: string;
          avgHoursPerDay: string;
          longestStreak: number;
        };
      }>("/me/attendance/heatmap", { year: params.year }),
    staleTime: 2 * 60_000,
    enabled: canAttendance,
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
  options?: Omit<
    UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>,
    "mutationFn"
  >,
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
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canAttendance = useCan("hr:attendance:view");
  return useQuery({
    queryKey: [
      ...queryKeys.hr.all,
      orgId,
      "team-attendance-status",
      params ?? {},
    ] as const,
    queryFn: () =>
      apiClient.get<TeamAttendanceStatusResponse>(
        "/hr/attendance/team-status",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 65_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
    enabled: !!orgId && canAttendance,
  });
}

export function useCreateRegularization(
  options?: Omit<
    UseMutationOptions<
      AttendanceRegularization,
      Error,
      CreateRegularizationInput
    >,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "regularization", "create"],
    mutationFn: (data: CreateRegularizationInput) =>
      apiClient.post<AttendanceRegularization>(
        "/me/attendance/regularizations",
        data,
      ),
    onSuccess: (...args) => {
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "regularizations"],
      });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}
