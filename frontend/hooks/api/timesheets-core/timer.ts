"use client";

import { useRef } from "react";
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
  TimerStatus,
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

export const TIMER_POLL_MS = {
  running: 15_000,
  paused: 60_000,
  idleMin: 60_000,
  idleMax: 300_000,
  idleStepMs: 120_000,
} as const;

/**
 * How long to wait before asking for an active timer again.
 *
 * A running timer is the only state where the answer changes on its own, and
 * it is the state a person is watching, so it polls fastest. A paused timer
 * only moves when its owner moves it. With no timer at all the endpoint is
 * being asked a question whose answer has been "no" for however long the
 * viewer has had this tab open, so the interval doubles every two idle minutes
 * up to a five-minute ceiling — the previous flat 120s asked ~30 times an hour
 * of every open My Time tab in the org, forever.
 *
 * Backoff is derived from elapsed idle time rather than a poll counter so it
 * is a pure function of the clock: StrictMode's double invoke cannot advance
 * it twice, and it resets the moment a timer exists again.
 */
export function timerPollIntervalMs(
  status: TimerStatus | null | undefined,
  idleMs: number,
): number {
  if (status === "RUNNING") return TIMER_POLL_MS.running;
  if (status === "PAUSED") return TIMER_POLL_MS.paused;
  const steps = Math.max(0, Math.floor(idleMs / TIMER_POLL_MS.idleStepMs));
  const backed = TIMER_POLL_MS.idleMin * 2 ** Math.min(steps, 10);
  return Math.min(backed, TIMER_POLL_MS.idleMax);
}

export function useActiveTimer() {
  const canView = useCan("timesheets:entries:view");
  const lastActiveAt = useRef<number | null>(null);
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.timerActive(),
    queryFn: ({ signal }) => apiClient.get<TimerSession | null>("/timesheets/timer/active", undefined, signal, timerNullableC),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? null;
      const now = Date.now();
      const active = status === "RUNNING" || status === "PAUSED";
      if (active || lastActiveAt.current === null) lastActiveAt.current = now;
      return timerPollIntervalMs(status, now - lastActiveAt.current);
    },
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
