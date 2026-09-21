"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CursorPage, PeriodStatus, TimesheetPeriod } from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const approvalsListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-approvals-schema").then((m) => m.approvalsListResponseContract),
);
const timesheetPeriodC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-period-schema").then((m) => m.timesheetPeriodContract),
);
const bulkApproveC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-approvals-schema").then((m) => m.bulkApproveResponseContract),
);
const bulkRejectC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-approvals-schema").then((m) => m.bulkRejectResponseContract),
);

type ApprovalStatusFilter = Extract<PeriodStatus, "SUBMITTED" | "APPROVED" | "REJECTED">;

export const APPROVALS_PAGE_SIZE = 25;

interface ApprovalsQuery {
  status?: ApprovalStatusFilter;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface ApprovalsQueryParams {
  status?: ApprovalStatusFilter;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  cursor?: string;
}

export function useApprovals(query: ApprovalsQuery = {}, enabled = true) {
  const canView = useCan("timesheets:approvals:view");
  const filters = {
    status: query.status,
    userId: query.userId,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: query.limit ?? 50,
  };
  return useInfiniteQuery<CursorPage<TimesheetPeriod>>({
    queryKey: usersAndCommerceQueryKeys.timesheets.approvals(filters),
    queryFn: ({ pageParam , signal }) => {
      const params: ApprovalsQueryParams = {
        status: filters.status,
        userId: filters.userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: filters.limit,
      };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<CursorPage<TimesheetPeriod>>("/timesheets/approvals", params, signal, approvalsListC);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

function patchPeriodAcrossPages(
  prev: InfiniteData<CursorPage<TimesheetPeriod>> | undefined,
  periodId: number,
  patch: Partial<TimesheetPeriod>,
): InfiniteData<CursorPage<TimesheetPeriod>> | undefined {
  if (!prev) return prev;
  return {
    ...prev,
    pages: prev.pages.map((page) => ({
      ...page,
      data: page.data.map((p) => (p.id === periodId ? { ...p, ...patch } : p)),
    })),
  };
}

export function useApprovePeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:approvals:manage", {
    mutationKey: ["timesheets", "approvals", "approve"],
    mutationFn: (periodId: number) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/approve`, undefined, undefined, timesheetPeriodC),
    onMutate: async (periodId) => {
      await qc.cancelQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      const snapshots = qc.getQueriesData<InfiniteData<CursorPage<TimesheetPeriod>>>({
        queryKey: usersAndCommerceQueryKeys.timesheets.approvals(),
      });
      qc.setQueriesData<InfiniteData<CursorPage<TimesheetPeriod>>>(
        { queryKey: usersAndCommerceQueryKeys.timesheets.approvals() },
        (prev) =>
          patchPeriodAcrossPages(prev, periodId, {
            status: "APPROVED",
            approvedAt: new Date().toISOString(),
          }),
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots)
        for (const [key, data] of ctx.snapshots) qc.setQueryData(key, data);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Timesheet approved");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
    },
  });
}

export function useRejectPeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:approvals:manage", {
    mutationKey: ["timesheets", "approvals", "reject"],
    mutationFn: ({ periodId, reason }: { periodId: number; reason: string }) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/reject`, { reason }, undefined, timesheetPeriodC),
    onMutate: async ({ periodId, reason }) => {
      await qc.cancelQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      const snapshots = qc.getQueriesData<InfiniteData<CursorPage<TimesheetPeriod>>>({
        queryKey: usersAndCommerceQueryKeys.timesheets.approvals(),
      });
      qc.setQueriesData<InfiniteData<CursorPage<TimesheetPeriod>>>(
        { queryKey: usersAndCommerceQueryKeys.timesheets.approvals() },
        (prev) =>
          patchPeriodAcrossPages(prev, periodId, {
            status: "REJECTED",
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason,
          }),
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots)
        for (const [key, data] of ctx.snapshots) qc.setQueryData(key, data);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Timesheet rejected");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:approvals:manage", {
    mutationKey: ["timesheets", "approvals", "bulk-approve"],
    mutationFn: (periodIds: number[]) =>
      apiClient.post<{ approved: number }>("/timesheets/approvals/bulk-approve", { periodIds }, undefined, bulkApproveC),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
      toast.success(`${res.approved} timesheet${res.approved === 1 ? "" : "s"} approved`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:approvals:manage", {
    mutationKey: ["timesheets", "approvals", "bulk-reject"],
    mutationFn: ({ periodIds, reason }: { periodIds: number[]; reason: string }) =>
      apiClient.post<{ rejected: number }>("/timesheets/approvals/bulk-reject", { periodIds, reason }, undefined, bulkRejectC),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.approvals() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
      toast.success(`${res.rejected} timesheet${res.rejected === 1 ? "" : "s"} rejected`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
