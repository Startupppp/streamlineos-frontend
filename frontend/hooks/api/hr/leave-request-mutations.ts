"use client";

import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  leaveApproveC,
  leaveCancelC,
  leaveRejectC,
  leaveRevertC,
  requestLeaveC,
} from "@/hooks/api/hr/leaves-contracts";
import {
  leaveContextKey,
  leaveMyRequestsKey,
  leaveMyRequestsPagesKey,
  leaveTeamKey,
  leaveThisWeekKey,
  useInvalidateLeaveDashboard,
  useLeaveQueryIdentity,
} from "@/hooks/api/hr/leaves-query-identity";
import type { RequestLeaveInput } from "@/types/hr";
import { invalidateCalendarProjectionWindows } from "@/lib/calendar-projection-cache";

export function useRequestLeave() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  return useAuthorizedMutation("self:leaves", {
    mutationKey: ["hr", "leaves", "request"],
    mutationFn: (data: RequestLeaveInput) =>
      apiClient.post<{ success: boolean }>("/me/time-off", data, undefined, requestLeaveC),
    onSuccess: (_created, input) => {
      const provisional = {
        id: -Math.abs(Date.now() % 1_000_000_000),
        startDate: input.startDate,
        endDate: input.endDate,
        status: "PENDING" as const,
        priority: input.priority ?? "MEDIUM",
        reason: input.reason ?? null,
        leaveType: null,
        approver: null,
        isHalfDay: input.isHalfDay ?? false,
        halfDayPeriod: input.halfDayPeriod ?? null,
      };
      qc.setQueriesData(
        { queryKey: leaveMyRequestsPagesKey(identity) },
        (current: { pages?: Array<{ data: unknown[] }> } | undefined) => {
          if (!current?.pages?.length) return current;
          const [first, ...rest] = current.pages;
          if (!first) return current;
          return {
            ...current,
            pages: [{ ...first, data: [provisional, ...first.data] }, ...rest],
          };
        },
      );
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      void qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      void qc.invalidateQueries({ queryKey: leaveMyRequestsPagesKey(identity) });
      invalidateLeaveDashboard();
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useApproveLeaveDedicated() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  // @Idempotent("hr.leave.approve"): one key per decision, reused on retry.
  return useAuthorizedIdempotentMutation<
    { success: boolean },
    Error,
    { leaveId: number; comment?: string; confirmSelfApproval?: boolean }
  >("hr:leaves:approve", {
    mutationKey: ["hr", "leaves", "approve"],
    mutationFn: ({ leaveId, comment, confirmSelfApproval }, idempotencyKey) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/approve`, {
        comment,
        ...(confirmSelfApproval ? { confirmSelfApproval } : {}),
      }, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }, leaveApproveC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useRejectLeaveDedicated() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  const invalidateLeaveDashboard = useInvalidateLeaveDashboard();
  // @Idempotent("hr.leave.reject"): one key per decision, reused on retry.
  return useAuthorizedIdempotentMutation<
    { success: boolean },
    Error,
    { leaveId: number; reason: string; comment?: string }
  >("hr:leaves:approve", {
    mutationKey: ["hr", "leaves", "reject"],
    mutationFn: ({ leaveId, reason, comment }, idempotencyKey) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/reject`, {
        reason,
        comment,
      }, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }, leaveRejectC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
      invalidateCalendarProjectionWindows(qc);
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
      apiClient.patch<{ success: boolean }>(`/me/time-off/${leaveId}/cancel`, {}, undefined, leaveCancelC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveThisWeekKey(identity) });
      invalidateLeaveDashboard();
      invalidateCalendarProjectionWindows(qc);
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
      }, undefined, leaveRevertC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
      qc.invalidateQueries({ queryKey: leaveTeamKey(identity) });
      qc.invalidateQueries({ queryKey: leaveMyRequestsKey(identity) });
      invalidateLeaveDashboard();
      invalidateCalendarProjectionWindows(qc);
    },
  });
}
