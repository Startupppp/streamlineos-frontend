"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { PeriodStatus, TimesheetPeriod } from "@/features/timesheets-core/types";

interface ApprovalsQuery {
  status?: PeriodStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useApprovals(query: ApprovalsQuery = {}, enabled = true) {
  const canView = useCan("timesheets:approvals:view");
  const params = {
    status: query.status,
    userId: query.userId,
    startDate: query.startDate,
    endDate: query.endDate,
  };
  return useQuery({
    queryKey: queryKeys.timesheets.approvals(params),
    queryFn: () => apiClient.get<TimesheetPeriod[]>("/timesheets/approvals", params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useApprovePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "approve"],
    mutationFn: (periodId: number) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/approve`),
    onMutate: async (periodId) => {
      await qc.cancelQueries({ queryKey: queryKeys.timesheets.approvals() });
      const snapshots = qc.getQueriesData<TimesheetPeriod[]>({
        queryKey: queryKeys.timesheets.approvals(),
      });
      qc.setQueriesData<TimesheetPeriod[]>(
        { queryKey: queryKeys.timesheets.approvals() },
        (prev) =>
          prev?.map((p) =>
            p.id === periodId
              ? { ...p, status: "APPROVED" as const, approvedAt: new Date().toISOString() }
              : p,
          ) ?? prev,
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Timesheet approved");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periods() });
    },
  });
}

export function useRejectPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "reject"],
    mutationFn: ({ periodId, reason }: { periodId: number; reason: string }) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/reject`, { reason }),
    onMutate: async ({ periodId, reason }) => {
      await qc.cancelQueries({ queryKey: queryKeys.timesheets.approvals() });
      const snapshots = qc.getQueriesData<TimesheetPeriod[]>({
        queryKey: queryKeys.timesheets.approvals(),
      });
      qc.setQueriesData<TimesheetPeriod[]>(
        { queryKey: queryKeys.timesheets.approvals() },
        (prev) =>
          prev?.map((p) =>
            p.id === periodId
              ? {
                  ...p,
                  status: "REJECTED" as const,
                  rejectedAt: new Date().toISOString(),
                  rejectionReason: reason,
                }
              : p,
          ) ?? prev,
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Timesheet rejected");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periods() });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "approvals", "bulk-approve"],
    mutationFn: (periodIds: number[]) =>
      apiClient.post<{ approved: number }>("/timesheets/approvals/bulk-approve", { periodIds }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periods() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periods() });
      toast.success(`${res.rejected} timesheet${res.rejected === 1 ? "" : "s"} rejected`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
