"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PeriodStatus, TimesheetPeriod } from "@/features/timesheets-core/types";

interface ApprovalsQuery {
  status?: PeriodStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useApprovals(query: ApprovalsQuery = {}, enabled = true) {
  const params = {
    status: query.status,
    userId: query.userId,
    startDate: query.startDate,
    endDate: query.endDate,
  };
  return useQuery({
    queryKey: queryKeys.timesheets.approvals(params),
    queryFn: () => apiClient.get<TimesheetPeriod[]>("/timesheets/approvals", params),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useApprovePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "approve"],
    mutationFn: (periodId: number) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/approve`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Timesheet approved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "reject"],
    mutationFn: ({ periodId, reason }: { periodId: number; reason: string }) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/reject`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Timesheet rejected");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "bulk-approve"],
    mutationFn: (periodIds: number[]) =>
      apiClient.post<{ approved: number }>("/timesheets/approvals/bulk-approve", { periodIds }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success(`${res.approved} timesheet${res.approved === 1 ? "" : "s"} approved`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "bulk-reject"],
    mutationFn: ({ periodIds, reason }: { periodIds: number[]; reason: string }) =>
      apiClient.post<{ rejected: number }>("/timesheets/approvals/bulk-reject", { periodIds, reason }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success(`${res.rejected} timesheet${res.rejected === 1 ? "" : "s"} rejected`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
