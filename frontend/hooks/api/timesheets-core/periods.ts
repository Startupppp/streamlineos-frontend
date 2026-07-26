"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { PeriodDetail, PeriodStatus, TimesheetPeriod } from "@/features/timesheets-core/types";

interface PeriodsQuery {
  userId?: string;
  status?: PeriodStatus;
  limit?: number;
}

export function usePeriods(query: PeriodsQuery = {}, enabled = true) {
  const canView = useCan("timesheets:entries:view");
  const params = { userId: query.userId, status: query.status, limit: query.limit };
  return useQuery({
    queryKey: queryKeys.timesheets.periods(params),
    queryFn: () => apiClient.get<TimesheetPeriod[]>("/timesheets/periods", params),
    staleTime: 30_000,
    enabled: enabled && canView,
  });
}

export function useCurrentPeriod() {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: queryKeys.timesheets.periodCurrent(),
    queryFn: () => apiClient.get<PeriodDetail>("/timesheets/periods/current"),
    staleTime: 15_000,
    enabled: canView,
  });
}

export function usePeriod(periodId: number | null) {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: queryKeys.timesheets.period(periodId ?? 0),
    queryFn: () => apiClient.get<PeriodDetail>(`/timesheets/periods/${periodId}`),
    staleTime: 15_000,
    enabled: periodId !== null && canView,
  });
}

function usePeriodAction(action: "submit" | "recall" | "reopen" | "lock" | "unlock", message: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "periods", action],
    mutationFn: (periodId: number) =>
      apiClient.post<TimesheetPeriod>(`/timesheets/periods/${periodId}/${action}`),
    onSuccess: (_data, periodId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periods() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periodCurrent() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.period(periodId) });
      toast.success(message);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSubmitPeriod() {
  return usePeriodAction("submit", "Timesheet submitted for approval");
}

export function useRecallPeriod() {
  return usePeriodAction("recall", "Timesheet recalled");
}

export function useReopenPeriod() {
  return usePeriodAction("reopen", "Timesheet reopened");
}

export function useLockPeriod() {
  return usePeriodAction("lock", "Period locked");
}

export function useUnlockPeriod() {
  return usePeriodAction("unlock", "Period unlocked");
}
