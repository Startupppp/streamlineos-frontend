"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ConvertTimerInput,
  StartTimerInput,
  TimerSession,
  TimesheetEntry,
} from "@/features/timesheets-core/types";

export function useActiveTimer() {
  return useQuery({
    queryKey: queryKeys.timesheets.timerActive(),
    queryFn: () => apiClient.get<TimerSession | null>("/timesheets/timer/active"),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "timer", "start"],
    mutationFn: (data: StartTimerInput) =>
      apiClient.post<TimerSession>("/timesheets/timer/start", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.timerActive() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.timerActive() });
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

export function useStopTimer() {
  return useTimerAction("stop");
}

export function useDiscardTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "timer", "discard"],
    mutationFn: (timerId: number) =>
      apiClient.post<{ success: boolean }>(`/timesheets/timer/${timerId}/discard`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.timerActive() });
      toast.success("Timer discarded");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useConvertTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "timer", "convert"],
    mutationFn: ({ timerId, data }: { timerId: number; data: ConvertTimerInput }) =>
      apiClient.post<TimesheetEntry>(`/timesheets/timer/${timerId}/convert`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Timer saved as time entry");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
