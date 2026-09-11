"use client";

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useSession } from "next-auth/react";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
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

const attendanceStatusC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.attendanceStatusContract),
);
const attendanceHistoryC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.attendanceHistoryContract),
);
const attendanceRowListC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.attendanceRowListContract),
);
const checkInOutC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.checkInOutContract),
);
const timesheetRowListC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.timesheetRowListContract),
);
const timesheetRowSingleC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.timesheetRowSingleContract),
);
const teamAttendanceStatusC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.teamAttendanceStatusContract),
);
const regularizationRowC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-schema").then((m) => m.regularizationRowContract),
);

export interface AttendanceRegularization {
  id: number;
  orgId: string;
  userId: string;
  attendanceDate: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: string;
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
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
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
    queryKey: humanResourcesQueryKeys.hr.attendanceStatus(),
    queryFn: ({ signal }) =>
      apiClient.get<AttendanceStatusResult>("/me/attendance/status", undefined, signal, attendanceStatusC),
    staleTime: 2 * 60_000,
    refetchInterval: (query) => activeAttendancePollInterval(query.state.data),
    refetchIntervalInBackground: false,
    ...restOptions,
    enabled: !!orgId && canAttendance && (optEnabled ?? true),
  });
}

export function useHrAttendanceHistory(cursor: string | undefined, limit: number) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canAttendance = useCan("self:attendance");
  const params = cursor ? { cursor, limit } : { limit };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.attendanceHistory(params),
    queryFn: async ({ signal }): Promise<AttendanceHistoryResponse> => {
      try {
        return await apiClient.get<AttendanceHistoryResponse>(
          "/me/attendance/history",
          params, signal, attendanceHistoryC,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 404) throw error;
        const legacyData = await apiClient.get<AttendanceLog[]>(
          "/me/attendance/logs", undefined, signal, attendanceRowListC,
        );
        return {
          data: legacyData.slice(0, limit),
          pagination: { limit, hasMore: false, nextCursor: null },
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
  const statusKey = humanResourcesQueryKeys.hr.attendanceStatus();
  return useMutation({
    mutationKey: ["hr", "attendance", "check-in"],
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/me/attendance/check-in", data, undefined, checkInOutC),
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
        queryKey: [...humanResourcesQueryKeys.hr.all, "attendanceHistory"],
      });
      void qc.invalidateQueries({
        queryKey: [...humanResourcesQueryKeys.hr.all, "monthlyAttendance"],
      });
      void qc.invalidateQueries({
        queryKey: collaborationQueryKeys.dashboard.teamAttendance(),
        exact: true,
      });
    },
    onSuccess: options?.onSuccess,
  });
}

export function useHrCheckOut(
  options?: Omit<
    UseMutationOptions<{ success: boolean }, Error, void>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const statusKey = humanResourcesQueryKeys.hr.attendanceStatus();
  return useMutation({
    mutationKey: ["hr", "attendance", "check-out"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/me/attendance/check-out", {}, undefined, checkInOutC),
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
        queryKey: [...humanResourcesQueryKeys.hr.all, "attendanceHistory"],
      });
      void qc.invalidateQueries({
        queryKey: [...humanResourcesQueryKeys.hr.all, "monthlyAttendance"],
      });
      void qc.invalidateQueries({
        queryKey: collaborationQueryKeys.dashboard.teamAttendance(),
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
  const statusKey = humanResourcesQueryKeys.hr.attendanceStatus();
  return useMutation({
    mutationKey: ["hr", "attendance", "toggle-break"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/me/attendance/break", undefined, undefined, checkInOutC),
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
        queryKey: [...humanResourcesQueryKeys.hr.all, "monthlyAttendance"],
      });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  const canSelf = useCan("self:attendance");
  const canManage = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  const isOtherUser = params.userId !== undefined;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.monthlyAttendance(params),
    queryFn: ({ signal }) => {
      const qParams = { year: params.year, month: params.month, ...(params.userId ? { userId: params.userId } : {}) };
      if (isOtherUser)
        return apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", qParams, signal, attendanceRowListC);
      return apiClient.get<AttendanceLog[]>("/me/attendance/monthly", qParams, signal, attendanceRowListC);
    },
    staleTime: 2 * 60_000,
    enabled: isOtherUser ? hrEnabled && canManage : canSelf,
  });
}

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const canAttendance = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;
  if (input.month !== undefined) params.month = input.month;
  if (input.dateFrom) params.dateFrom = input.dateFrom;
  if (input.dateTo) params.dateTo = input.dateTo;

  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.workLogs(params),
    queryFn: ({ signal }) => apiClient.get<WorkLog[]>("/hr/work-logs", params, signal, timesheetRowListC),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canAttendance,
  });
}

export function useUpsertWorkLog(
  options?: Omit<
    UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:view", {
    ...options,
    mutationKey: ["hr", "work-logs", "upsert"],
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data, undefined, timesheetRowSingleC),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.workLogs() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}

export function useHrTeamAttendanceStatus(params?: TeamAttendanceStatusQuery) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canAttendance = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      orgId,
      "team-attendance-status",
      params ?? {},
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<TeamAttendanceStatusResponse>(
        "/hr/attendance/team-status",
        params, signal, teamAttendanceStatusC,
      ),
    staleTime: 65_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
    enabled: !!orgId && hrEnabled && canAttendance,
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
  return useAuthorizedMutation("self:attendance", {
    mutationKey: ["hr", "regularization", "create"],
    mutationFn: (data: CreateRegularizationInput) =>
      apiClient.post<AttendanceRegularization>(
        "/me/attendance/regularizations",
        data, undefined, regularizationRowC,
      ),
    onSuccess: (...args) => {
      qc.invalidateQueries({
        queryKey: [...humanResourcesQueryKeys.hr.all, "regularizations"],
      });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}
