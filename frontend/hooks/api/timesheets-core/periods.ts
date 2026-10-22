"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { PeriodDetail, TimesheetPeriod } from "@/features/timesheets/types";
import type { PeriodApproverPreview } from "@/hooks/api/timesheets-core/timesheets-period-schema";

const periodDetailC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-period-schema").then((m) => m.periodDetailResponseContract),
);
const timesheetPeriodC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-period-schema").then((m) => m.timesheetPeriodContract),
);
const periodApproverPreviewC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-period-schema").then((m) => m.periodApproverPreviewContract),
);

export function useCurrentPeriod() {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent(),
    queryFn: ({ signal }) => apiClient.get<PeriodDetail>("/timesheets/periods/current", undefined, signal, periodDetailC),
    staleTime: 15_000,
    enabled: canView,
  });
}

export function useCanViewPeriodDetail(): boolean {
  const canViewEntries = useCan("timesheets:entries:view");
  const canViewTeam = useCan("timesheets:team:view");
  const canViewApprovals = useCan("timesheets:approvals:view");
  return canViewEntries || canViewTeam || canViewApprovals;
}

export function usePeriod(periodId: number | null) {
  const canView = useCanViewPeriodDetail();
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.period(periodId ?? 0),
    queryFn: ({ signal }) => apiClient.get<PeriodDetail>(`/timesheets/periods/${periodId}`, undefined, signal, periodDetailC),
    staleTime: 15_000,
    enabled: periodId !== null && canView,
    ...INLINE_READ_ERROR,
  });
}

export function usePeriodApproverPreview(periodId: number | null, options?: { enabled?: boolean }) {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.periodApprover(periodId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<PeriodApproverPreview>(`/timesheets/periods/${periodId}/approver`, undefined, signal, periodApproverPreviewC),
    staleTime: 60_000,
    enabled: periodId !== null && canView && (options?.enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}

function invalidatePeriod(qc: QueryClient, periodId: number): void {
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent() });
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.period(periodId) });
}

function usePeriodAction(
  action: "submit" | "recall",
  message: string,
  request: (periodId: number) => Promise<TimesheetPeriod>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "periods", action],
    mutationFn: request,
    onSuccess: (_, periodId) => {
      invalidatePeriod(qc, periodId);
      toast.success(message);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSubmitPeriod() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<TimesheetPeriod, Error, number>("timesheets:entries:create", {
    mutationKey: ["timesheets", "periods", "submit"],
    mutationFn: (periodId: number, idempotencyKey: string) =>
      apiClient.post<TimesheetPeriod>(
        `/timesheets/periods/${periodId}/submit`,
        undefined,
        { headers: { "Idempotency-Key": idempotencyKey } },
        timesheetPeriodC,
      ),
    onSuccess: (_, periodId) => {
      invalidatePeriod(qc, periodId);
      toast.success("Timesheet submitted for approval");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRecallPeriod() {
  return usePeriodAction("recall", "Timesheet recalled", (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/recall`, undefined, undefined, timesheetPeriodC),
  );
}


type PeriodLifecycleAction = "lock" | "unlock" | "reopen";

const LIFECYCLE_TOAST: Record<PeriodLifecycleAction, string> = {
  lock: "Timesheet locked",
  unlock: "Timesheet unlocked",
  reopen: "Timesheet reopened for editing",
};

const LIFECYCLE_REQUEST: Record<PeriodLifecycleAction, (periodId: number) => Promise<TimesheetPeriod>> = {
  lock: (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/lock`, undefined, undefined, timesheetPeriodC),
  unlock: (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/unlock`, undefined, undefined, timesheetPeriodC),
  reopen: (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/reopen`, undefined, undefined, timesheetPeriodC),
};

export function usePeriodLifecycle(action: PeriodLifecycleAction) {
  const qc = useQueryClient();
  return useAuthorizedMutation<TimesheetPeriod, Error, number>("timesheets:approvals:manage", {
    mutationKey: ["timesheets", "periods", action],
    mutationFn: (periodId) => LIFECYCLE_REQUEST[action](periodId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.all });
      toast.success(LIFECYCLE_TOAST[action]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
