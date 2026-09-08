"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
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

const timerNullableC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-timer-schema").then((m) => m.timerNullableResponseContract),
);
const timerDiscardC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-timer-schema").then((m) => m.timerDiscardResultContract),
);
const timerC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-timer-schema").then((m) => m.timerContract),
);
const entryC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-entry-schema").then((m) => m.entryContract),
);

export function useActiveTimer() {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.timerActive(),
    queryFn: ({ signal }) => apiClient.get<TimerSession | null>("/timesheets/timer/active", undefined, signal, timerNullableC),
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
      apiClient.post<TimerSession>("/timesheets/timer/start", data, undefined, timerC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/**
 * Each action passes its own literal path rather than interpolating the action
 * name: a path segment built from a variable is a path the contract scan cannot
 * read, so drift on it would never be reported.
 */
function useTimerAction(action: "pause" | "resume", request: (timerId: number) => Promise<TimerSession>) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "timer", action],
    mutationFn: request,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function usePauseTimer() {
  return useTimerAction("pause", (timerId) =>
    apiClient.post<TimerSession>(`/timesheets/timer/${timerId}/pause`, undefined, undefined, timerC),
  );
}

export function useResumeTimer() {
  return useTimerAction("resume", (timerId) =>
    apiClient.post<TimerSession>(`/timesheets/timer/${timerId}/resume`, undefined, undefined, timerC),
  );
}

export function useDiscardTimer() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:create", {
    mutationKey: ["timesheets", "timer", "discard"],
    mutationFn: (timerId: number) =>
      apiClient.post<{ success: true }>(`/timesheets/timer/${timerId}/discard`, undefined, undefined, timerDiscardC),
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
      apiClient.post<TimesheetEntry>(`/timesheets/timer/${timerId}/convert`, data, undefined, entryC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.timerActive() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent() });
      toast.success("Timer saved as time entry");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
