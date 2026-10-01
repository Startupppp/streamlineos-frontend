"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * Period detail is reached from three surfaces, not one: My Time (own entries),
 * Team and Approvals. Gating the read on `timesheets:entries:view` alone leaves
 * a manager who holds only team or approvals view with a disabled query, and a
 * disabled query reports `isLoading: false` with no data — so the detail sheet
 * renders "no entries" for a timesheet it was never allowed to ask for.
 *
 * The caller still has to say which of the three it is; this only decides
 * whether asking is worth a request at all.
 */
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
    // The detail sheet is a satellite of Team and Approvals: its failure must
    // show inside the sheet, not replace the whole route with an error page.
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
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periods() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.period(periodId) });
      toast.success(message);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSubmitPeriod() {
  return usePeriodAction("submit", "Timesheet submitted for approval", (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/submit`, undefined, undefined, timesheetPeriodC),
  );
}

export function useRecallPeriod() {
  return usePeriodAction("recall", "Timesheet recalled", (periodId) =>
    apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/recall`, undefined, undefined, timesheetPeriodC),
  );
}

