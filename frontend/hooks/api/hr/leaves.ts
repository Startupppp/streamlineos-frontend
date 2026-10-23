"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import {
  leaveAnalyticsC,
  leaveApprovalsC,
  leaveContextC,
  leavePolicyC,
  leaveRequestsPageC,
  leaveTypesListC,
  leavesThisWeekC,
  hrHolidaysListC,
} from "@/hooks/api/hr/leaves-contracts";
import {
  LEAVE_TYPES_KEY,
  leaveContextQueryOptions,
  leaveMyRequestsKey,
  leaveMyRequestsPagesKey,
  leaveTeamKey,
  leaveThisWeekKey,
  useLeaveQueryIdentity,
} from "@/hooks/api/hr/leaves-query-identity";
import type {
  HrLeaveAnalytics,
  HrLeaveType,
  LeaveContextResult,
  LeavePolicyResponse,
} from "@/hooks/api/hr/leaves-types";
import type {
  HrHolidayRow,
  LeaveRequestsPageResult,
  LeavesTeamPage,
  LeavesThisWeekRow,
} from "@/hooks/api/hr/leaves-schema";
import { NULL_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface LeaveTeamListParams {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  leaveTypeId?: number;
  from?: string;
  to?: string;
  limit?: number;
  decidedBy?: "me";
}

export * from "@/hooks/api/hr/leave-request-mutations";
export * from "@/hooks/api/hr/leave-type-mutations";
export type {
  HrLeaveType,
  LeavePolicyResponse,
} from "@/hooks/api/hr/leaves-types";

export function useLeaveTypesAdmin(options?: { enabled?: boolean }) {
  const canView = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: LEAVE_TYPES_KEY,
    queryFn: ({ signal }) => apiClient.get<HrLeaveType[]>("/hr/leaves/types", undefined, signal, leaveTypesListC),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}

export function useHrLeaveContext() {
  const canSelf = useCan("self:leaves");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    ...leaveContextQueryOptions(identity.orgId, identity.userId, identity.accessVersion),
    queryFn: ({ signal }) => apiClient.get<LeaveContextResult>("/me/time-off", undefined, signal, leaveContextC),
    enabled: Boolean(identity.orgId && identity.userId) && hrEnabled && canSelf,
    ...INLINE_READ_ERROR,
  });
}

export function useHrLeaveApprovals(
  options?: LeaveTeamListParams & { enabled?: boolean },
) {
  const canLeaves = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  const { enabled, ...params } = options ?? {};
  return useInfiniteQuery({
    queryKey: leaveTeamKey(identity, params),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<LeavesTeamPage>("/hr/leaves/team", {
        ...params,
        ...(pageParam !== null ? { cursor: pageParam } : {}),
      }, signal, leaveApprovalsC),
    initialPageParam: NULL_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled:
      Boolean(identity.orgId && identity.userId) &&
      hrEnabled &&
      canLeaves &&
      (enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}

export function useHrLeavesThisWeek(options?: { enabled?: boolean }) {
  const canSelf = useCan("self:leaves");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveThisWeekKey(identity),
    queryFn: ({ signal }) => apiClient.get<LeavesThisWeekRow[]>("/me/time-off/team-calendar", undefined, signal, leavesThisWeekC),
    staleTime: 2 * 60_000,
    enabled:
      Boolean(identity.orgId && identity.userId) &&
      hrEnabled &&
      canSelf &&
      (options?.enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}

export function useHrMyLeaveRequests(enabled = true, limit = 30) {
  const canSelf = useCan("self:leaves");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  return useQuery({
    queryKey: leaveMyRequestsKey(identity),
    queryFn: ({ signal }) =>
      apiClient.get<LeaveRequestsPageResult>(
        "/me/time-off/requests",
        { limit }, signal, leaveRequestsPageC,
      ),
    select: (response) => ({ requests: response.data }),
    staleTime: 2 * 60_000,
    enabled: Boolean(identity.orgId && identity.userId) && hrEnabled && canSelf && enabled,
    ...INLINE_READ_ERROR,
  });
}

export function useHrMyLeaveRequestsInfinite(enabled = true) {
  const canSelf = useCan("self:leaves");
  const hrEnabled = useModuleEnabled("hr");
  const identity = useLeaveQueryIdentity();
  return useInfiniteQuery({
    queryKey: leaveMyRequestsPagesKey(identity),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<LeaveRequestsPageResult>("/me/time-off/requests", {
        limit: 50,
        ...(pageParam !== null ? { cursor: pageParam } : {}),
      }, signal, leaveRequestsPageC),
    initialPageParam: NULL_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled: Boolean(identity.orgId && identity.userId) && hrEnabled && canSelf && enabled,
    ...INLINE_READ_ERROR,
  });
}

export function useHrHolidaysForCalendar(params: {
  year: number;
  month: number;
}) {
  const canAttendance = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.holidaysCalendar(params),
    queryFn: ({ signal }) =>
      apiClient.get<HrHolidayRow[]>(
        "/hr/holidays/calendar",
        params, signal, hrHolidaysListC,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canAttendance,
    ...INLINE_READ_ERROR,
  });
}

export function useHrLeaveAnalytics(year?: number) {
  const canView = useCan("hr:leaves:view");
  const hrEnabled = useModuleEnabled("hr");
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.leaveAnalytics(y),
    queryFn: ({ signal }) =>
      apiClient.get<HrLeaveAnalytics>("/hr/leaves/analytics", {
        year: String(y),
      }, signal, leaveAnalyticsC),
    staleTime: 120_000,
    enabled: hrEnabled && canView,
    ...INLINE_READ_ERROR,
  });
}

export function useLeavePolicy() {
  const canView = useCan("hr:leaves:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.leavePolicy(),
    queryFn: ({ signal }) => apiClient.get<LeavePolicyResponse>("/hr/leave-policy", undefined, signal, leavePolicyC),
    staleTime: 10 * 60 * 1000,
    enabled: canView,
    ...INLINE_READ_ERROR,
  });
}
