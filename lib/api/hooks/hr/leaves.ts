"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  LeavesResult,
  LeaveBalance,
  RequestLeaveInput,
  ApproveLeaveInput,
  AddHolidayInput,
  DeleteHolidayInput,
  UpdateHolidayInput,
  Holiday,
} from "@/types/hr";

export interface LeaveBlackoutDate {
  id: number;
  orgId: string;
  startDate: string;
  endDate: string;
  reason: string;
  appliesTo: string;
  createdBy: string | null;
  createdAt: string;
}

export interface HrLeaveAnalytics {
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

export function useHrLeaves() {
  return useQuery({
    queryKey: queryKeys.hr.leaves(),
    queryFn: () => apiClient.get<LeavesResult>("/hr/leaves"),
    staleTime: 2 * 60_000,
  });
}

export function useHrLeaveBalance() {
  return useQuery({
    queryKey: queryKeys.hr.leaveBalance(),
    queryFn: () => apiClient.get<LeaveBalance[]>("/hr/leaves/balance"),
    staleTime: 2 * 60_000,
  });
}

export function useRequestLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestLeaveInput) =>
      apiClient.post<{ success: boolean }>("/hr/leaves", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesMyRequests"] });
    },
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...data }: ApproveLeaveInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${requestId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() }),
  });
}

export function useHrMyLeaves() {
  return useQuery({
    queryKey: ["streamlineos", "hr", "leaves", "my"] as const,
    queryFn: () =>
      apiClient.get<{ requests: unknown[]; balances: unknown[] }>(
        "/hr/leaves/my",
      ),
    staleTime: 2 * 60_000,
  });
}

export function useHrTeamLeaves() {
  return useQuery({
    queryKey: ["streamlineos", "hr", "leaves", "team"] as const,
    queryFn: () =>
      apiClient.get<{ pending: unknown[]; all: unknown[] }>("/hr/leaves/team"),
    staleTime: 2 * 60_000,
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
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leaves", "team"] });
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesMyRequests"] });
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesThisWeek"] });
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
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leaves", "team"] });
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesMyRequests"] });
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
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesMyRequests"] });
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
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leaves", "team"] });
      qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "leavesMyRequests"] });
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

export function useHrLeaveApprovals() {
  return useQuery({
    queryKey: ["streamlineos", "hr", "leaves", "team"] as const,
    queryFn: () => apiClient.get<LeaveApprovalsResult>("/hr/leaves/team"),
    staleTime: 2 * 60_000,
  });
}

export function useHrLeavesThisWeek() {
  return useQuery({
    queryKey: [...["streamlineos"], "hr", "leavesThisWeek"] as const,
    queryFn: () => apiClient.get<unknown[]>("/hr/leaves/this-week"),
    staleTime: 2 * 60_000,
  });
}

export function useHrMyLeaveRequests() {
  return useQuery({
    queryKey: [...["streamlineos"], "hr", "leavesMyRequests"] as const,
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

export function useAddHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddHolidayInput) =>
      apiClient.post<{ success: boolean }>("/hr/holidays", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId }: DeleteHolidayInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/holidays/${holidayId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId, ...data }: UpdateHolidayInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/holidays/${holidayId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useLeaveBlackoutDates(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return useQuery({
    queryKey: [...queryKeys.hr.all, "leaveBlackout", from, to] as const,
    queryFn: () =>
      apiClient.get<LeaveBlackoutDate[]>("/hr/leaves/blackout", params),
    staleTime: 60_000,
  });
}

export function useCreateLeaveBlackout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      startDate: string;
      endDate: string;
      reason: string;
      appliesTo?: string;
    }) => apiClient.post<LeaveBlackoutDate>("/hr/leaves/blackout", data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "leaveBlackout"],
      }),
  });
}

export function useDeleteLeaveBlackout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/leaves/blackout/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "leaveBlackout"],
      }),
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

export function useCreditCompOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; days: number; reason?: string }) =>
      apiClient.post<{
        success: boolean;
        credited: number;
        leaveTypeId: number;
      }>("/hr/leaves/comp-off", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}
