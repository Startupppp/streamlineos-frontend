"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan, useModuleEnabled } from "@/hooks/api/access";
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

function useInvalidateLeaveDashboard() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";

  return function invalidateLeaveDashboard() {
    void qc.invalidateQueries({
      queryKey: queryKeys.dashboard.leavesToday(),
      exact: true,
    });
    void qc.invalidateQueries({
      queryKey: queryKeys.dashboard.myLeaveBalance(),
      exact: true,
    });
    void qc.invalidateQueries({
      queryKey: queryKeys.dashboard.pendingApprovals(),
      exact: true,
    });
  };
}

interface LeaveRequestsPage {
  data: unknown[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: number | null;
  };
}

function useLeaveQueryIdentity() {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  return {
    orgId: session?.orgId ?? "",
    userId: session?.user?.id ?? "",
    accessVersion: access?.version ?? 0,
  };
}

type LeaveIdentity = ReturnType<typeof useLeaveQueryIdentity>;

function leaveContextKey(identity: LeaveIdentity) {
  return queryKeys.hr.leaves(identity.orgId, identity.userId, identity.accessVersion);
}

function leaveTeamKey(identity: LeaveIdentity) {
  return queryKeys.hr.leavesTeam(identity.orgId, identity.userId, identity.accessVersion);
}

function leaveThisWeekKey(identity: LeaveIdentity) {
  return queryKeys.hr.leavesThisWeek(identity.orgId, identity.userId, identity.accessVersion);
}

function leaveMyRequestsKey(identity: LeaveIdentity) {
  return queryKeys.hr.leavesMyRequests(identity.orgId, identity.userId, identity.accessVersion);
}

export function useRequestLeave() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("self:leaves", {
    mutationKey: ["hr", "leaves", "request"],
    mutationFn: (data: RequestLeaveInput) =>
      apiClient.post<{ success: boolean }>("/me/time-off", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      invalidateLeaveDashboard();
    },
  });
}

export function useApproveLeaveDedicated() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("hr:leaves:approve", {
    mutationKey: ["hr", "leaves", "approve"],
    mutationFn: ({ leaveId, comment }: { leaveId: number; comment?: string }) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/approve`, {
        comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
    },
  });
}

export function useRejectLeaveDedicated() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("hr:leaves:approve", {
    mutationKey: ["hr", "leaves", "reject"],
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
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("self:leaves", {
    mutationKey: ["hr", "leaves", "cancel"],
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/me/time-off/${leaveId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
    },
  });
}

export function useRevertLeave() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("hr:leaves:approve", {
    mutationKey: ["hr", "leaves", "revert"],
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${leaveId}`, {
        status: "PENDING",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      invalidateLeaveDashboard();
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
  const canView = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: LEAVE_TYPES_KEY,
    queryFn: ({ signal }) => apiClient.get<HrLeaveType[]>("/hr/leaves/types", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useSeedLeaveTypes() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "seed-types"],
    mutationFn: () =>
      apiClient.post<{ seeded: number; skipped: number }>("/hr/leaves/types/seed-defaults"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "update-type"],
    mutationFn: ({ id, ...patch }: { id: number; name?: string; daysPerYear?: number; carryForward?: boolean }) =>
      apiClient.patch<HrLeaveType>(`/hr/leaves/types/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "delete-type"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/leaves/types/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "create-type"],
    mutationFn: (data: { name: string; daysPerYear: number; carryForward?: boolean }) =>
      apiClient.post<{ id: number; name: string; daysPerYear: number }>(
        "/hr/leaves/types",
        data,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useHrLeaveContext() {
  const canSelf = useCan("self:leaves");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveContextKey(identity),
    queryFn: ({ signal }) => apiClient.get<LeaveContextResult>("/me/time-off", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: Boolean(identity.orgId && identity.userId) && canSelf,
  });
}

export function useHrLeaveApprovals(options?: { enabled?: boolean }) {
  const canLeaves = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveTeamKey(identity),
    queryFn: ({ signal }) => apiClient.get<LeaveApprovalsResult>("/hr/leaves/team", undefined, signal),
    staleTime: 2 * 60_000,
    enabled:
      Boolean(identity.orgId && identity.userId) &&
      hrEnabled &&
      canLeaves &&
      (options?.enabled ?? true),
  });
}

export function useHrLeavesThisWeek(options?: { enabled?: boolean }) {
  const canSelf = useCan("self:leaves");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveThisWeekKey(identity),
    queryFn: ({ signal }) => apiClient.get<unknown[]>("/me/time-off/team-calendar", undefined, signal),
    staleTime: 2 * 60_000,
    enabled:
      Boolean(identity.orgId && identity.userId) &&
      canSelf &&
      (options?.enabled ?? true),
  });
}

export function useHrMyLeaveRequests(enabled = true) {
  const canSelf = useCan("self:leaves");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveMyRequestsKey(identity),
    queryFn: ({ signal }) =>
      apiClient.get<LeaveRequestsPage>(
        "/me/time-off/requests",
        { limit: 100 }, signal,
      ),
    select: (response) => ({ requests: response.data }),
    staleTime: 2 * 60_000,
    enabled: Boolean(identity.orgId && identity.userId) && canSelf && enabled,
  });
}

export function useHrMyLeaveRequestsInfinite(enabled = true) {
  const canSelf = useCan("self:leaves");
  const identity = useLeaveQueryIdentity();
  const key = leaveMyRequestsKey(identity);
  return useInfiniteQuery({
    queryKey: [...queryKeys.hr.leavesMyRequests(identity.orgId, identity.userId, identity.accessVersion), "pages"] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<LeaveRequestsPage>("/me/time-off/requests", {
        limit: 50,
        ...(pageParam !== null ? { cursor: pageParam } : {}),
      }, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled: Boolean(identity.orgId && identity.userId) && canSelf && enabled,
  });
}

export function useHrHolidaysForYear(year: number) {
  const canAttendance = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.holidaysYear(year),
    queryFn: ({ signal }) =>
      apiClient.get<Holiday[]>("/hr/holidays", { year } as Record<
        string,
        unknown
      >, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canAttendance,
  });
}

export function useHrHolidaysForCalendar(params: {
  year: number;
  month: number;
}) {
  const canAttendance = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.holidaysCalendar(params),
    queryFn: ({ signal }) =>
      apiClient.get<Holiday[]>(
        "/hr/holidays/calendar",
        params as Record<string, unknown>, signal,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canAttendance,
  });
}

export function useAddLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "create"],
    mutationFn: (data: AddHolidayInput) =>
      apiClient.post<{ success: boolean }>("/hr/holidays", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() });
    },
  });
}

export function useDeleteLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: ({ holidayId }: DeleteHolidayInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/holidays/${holidayId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() });
    },
  });
}

export function useUpdateLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ holidayId, ...data }: UpdateHolidayInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/holidays/${holidayId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysYear"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "holidaysCalendar"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "monthlyAttendance"] });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() });
    },
  });
}

export function useHrLeaveAnalytics(year?: number) {
  const canView = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: [...queryKeys.hr.all, "leaveAnalytics", y] as const,
    queryFn: ({ signal }) =>
      apiClient.get<HrLeaveAnalytics>("/hr/leaves/analytics", {
        year: String(y),
      }, signal),
    staleTime: 120_000,
    enabled: hrEnabled && canView,
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
  const canView = useCan("hr:leaves:view");
  return useQuery({
    queryKey: queryKeys.hr.leavePolicy(),
    queryFn: ({ signal }) => apiClient.get<LeavePolicyResponse>("/hr/leave-policy", undefined, signal),
    staleTime: 10 * 60 * 1000,
    enabled: canView,
  });
}
