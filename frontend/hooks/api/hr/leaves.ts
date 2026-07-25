"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  RequestLeaveInput,
  AddHolidayInput,
  DeleteHolidayInput,
  UpdateHolidayInput,
  Holiday,
} from "@/types/hr";


interface HrLeaveAnalytics {
  year: number;
  byDepartment: {
    department: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }[];
  monthlyTrend: { month: string; count: number }[];
  byLeaveType: { typeName: string; count: number }[];
  avgDaysByDepartment: { department: string; avgDays: number }[];
}

interface LeaveContextResult {
  balances: Array<{
    id: number;
    leaveTypeId: number | null;
    balance: string;
    typeName: string | null;
    daysPerYear: number | null;
  }>;
  types: Array<{
    id: number;
    name: string;
    daysPerYear: number;
    orgId: string;
  }>;
  joiningDate: string | null;
  approvers: Array<{
    id: string;
    name: string | null;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  }>;
}

interface LeaveApprovalsResult {
  pending: unknown[];
  all: unknown[];
}

export function useRequestLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestLeaveInput) =>
      apiClient.post<{ success: boolean }>("/hr/leaves", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesMyRequests() });
    },
  });
}

export function useApproveLeaveDedicated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, comment }: { leaveId: number; comment?: string }) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/approve`, {
        comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesTeam() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesMyRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesThisWeek() });
    },
  });
}

export function useRejectLeaveDedicated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaveId,
      reason,
      comment,
    }: {
      leaveId: number;
      reason: string;
      comment?: string;
    }) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/reject`, {
        reason,
        comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesTeam() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesMyRequests() });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${leaveId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesMyRequests() });
    },
  });
}

export function useRevertLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${leaveId}`, {
        status: "PENDING",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesTeam() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.leavesMyRequests() });
    },
  });
}

export interface HrLeaveType {
  id: number;
  name: string;
  daysPerYear: number;
  carryForward: boolean;
}

const LEAVE_TYPES_KEY = [...queryKeys.hr.all, "leaveTypesAdmin"] as const;

export function useLeaveTypesAdmin(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: LEAVE_TYPES_KEY,
    queryFn: () => apiClient.get<HrLeaveType[]>("/hr/leaves/types"),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useSeedLeaveTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leaves", "seed-types"],
    mutationFn: () =>
      apiClient.post<{ seeded: number; skipped: number }>("/hr/leaves/types/seed-defaults"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leaves", "update-type"],
    mutationFn: ({ id, ...patch }: { id: number; name?: string; daysPerYear?: number; carryForward?: boolean }) =>
      apiClient.patch<HrLeaveType>(`/hr/leaves/types/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
    },
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leaves", "delete-type"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/leaves/types/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
    },
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leaves", "create-type"],
    mutationFn: (data: { name: string; daysPerYear: number; carryForward?: boolean }) =>
      apiClient.post<{ id: number; name: string; daysPerYear: number }>(
        "/hr/leaves/types",
        data,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
    },
  });
}

export function useHrLeaveContext() {
  return useQuery({
    queryKey: queryKeys.hr.leaves(),
    queryFn: () => apiClient.get<LeaveContextResult>("/hr/leaves"),
    staleTime: 2 * 60_000,
  });
}

export function useHrLeaveApprovals(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.leavesTeam(),
    queryFn: () => apiClient.get<LeaveApprovalsResult>("/hr/leaves/team"),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useHrLeavesThisWeek() {
  return useQuery({
    queryKey: queryKeys.hr.leavesThisWeek(),
    queryFn: () => apiClient.get<unknown[]>("/hr/leaves/this-week"),
    staleTime: 2 * 60_000,
  });
}

export function useHrMyLeaveRequests() {
  return useQuery({
    queryKey: queryKeys.hr.leavesMyRequests(),
    queryFn: () =>
      apiClient.get<{ requests: unknown[]; balances: unknown[] }>(
        "/hr/leaves/my",
      ),
    staleTime: 2 * 60_000,
  });
}

export function useHrHolidaysForYear(year: number) {
  return useQuery({
    queryKey: queryKeys.hr.holidaysYear(year),
    queryFn: () =>
      apiClient.get<Holiday[]>("/hr/holidays", { year } as Record<
        string,
        unknown
      >),
    staleTime: 2 * 60_000,
  });
}

export function useHrHolidaysForCalendar(params: {
  year: number;
  month: number;
}) {
  return useQuery({
    queryKey: queryKeys.hr.holidaysCalendar(params),
    queryFn: () =>
      apiClient.get<Holiday[]>(
        "/hr/holidays/calendar",
        params as Record<string, unknown>,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useAddLegacyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddHolidayInput) =>
      apiClient.post<{ success: boolean }>("/hr/holidays", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: ["hr", "holidays"] });
    },
  });
}

export function useDeleteLegacyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId }: DeleteHolidayInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/holidays/${holidayId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: ["hr", "holidays"] });
    },
  });
}

export function useUpdateLegacyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId, ...data }: UpdateHolidayInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/holidays/${holidayId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: ["hr", "holidays"] });
    },
  });
}


export function useHrLeaveAnalytics(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: [...queryKeys.hr.all, "leaveAnalytics", y] as const,
    queryFn: () =>
      apiClient.get<HrLeaveAnalytics>("/hr/leaves/analytics", {
        year: String(y),
      }),
    staleTime: 120_000,
  });
}



export interface LeavePolicyType {
  name: string;
  daysPerYear: number;
  carryForward: boolean;
  expiresMonthly: boolean;
}

export interface LeavePolicyResponse {
  wfhMonthlyQuota: number | null;
  leaveTypes: LeavePolicyType[];
}

export function useLeavePolicy() {
  return useQuery({
    queryKey: ["hr", "leave-policy"],
    queryFn: () => apiClient.get<LeavePolicyResponse>("/hr/leave-policy"),
    staleTime: 10 * 60 * 1000,
  });
}
