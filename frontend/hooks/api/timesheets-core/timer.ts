"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  ConvertTimerInput,
  StartTimerInput,
  TimerSession,
  TimesheetEntry,
} from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useActiveTimer() {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.timerActive(),
    queryFn: ({ signal }) => apiClient.get<TimerSession | null>("/timesheets/timer/active", undefined, signal),
    staleTime: 30_000,
    refetchInterval: (query) => (query.state.data ? 30_000 : 120_000),
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:create", {
    mutationKey: ["timesheets", "timer", "start"],
    mutationFn: (data: StartTimerInput) =>
      apiClient.post<TimerSession>("/timesheets/timer/start", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

function useTimerAction(action: "pause" | "resume" | "stop") {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "timer", action],
    mutationFn: (timerId: number) =>
      apiClient.post<TimerSession>(`/timesheets/timer/${timerId}/${action}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function usePauseTimer() {
  return useTimerAction("pause");
}

export function useResumeTimer() {
  return useTimerAction("resume");
}

export function useDiscardTimer() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:create", {
    mutationKey: ["timesheets", "timer", "discard"],
    mutationFn: (timerId: number) =>
      apiClient.post<{ success: boolean }>(`/timesheets/timer/${timerId}/discard`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
      toast.success("Timer discarded");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useConvertTimer() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:create", {
    mutationKey: ["timesheets", "timer", "convert"],
    mutationFn: ({ timerId, data }: { timerId: number; data: ConvertTimerInput }) =>
      apiClient.post<TimesheetEntry>(`/timesheets/timer/${timerId}/convert`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent() });
      toast.success("Timer saved as time entry");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
