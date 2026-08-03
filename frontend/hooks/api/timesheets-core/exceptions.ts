"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ExceptionsQueryInput,
  ExceptionsSummary,
  RunDetectionResult,
  TimesheetException,
  TimesheetExceptionRecord,
} from "@/features/timesheets/types";

const exceptionsListPrefix = queryKeys.timesheets
  .exceptions(undefined)
  .slice(0, -1);

function invalidateExceptionQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: exceptionsListPrefix });
  void qc.invalidateQueries({
    queryKey: queryKeys.timesheets.exceptionsSummary(),
  });
}

export function useTimesheetExceptions(
  query: ExceptionsQueryInput = {},
  enabled = true,
) {
  const params = {
    status: query.status,
    severity: query.severity,
    rule: query.rule,
    userId: query.userId,
    page: query.page,
    limit: query.limit,
  };
  return useQuery({
    queryKey: queryKeys.timesheets.exceptions(params),
    queryFn: () =>
      apiClient.get<TimesheetException[]>("/timesheets/exceptions", params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useExceptionsSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheets.exceptionsSummary(),
    queryFn: () =>
      apiClient.get<ExceptionsSummary>("/timesheets/exceptions/summary"),
    staleTime: 60_000,
    enabled,
  });
}

export function useResolveException() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "exceptions", "resolve"],
    mutationFn: ({ exceptionId, reason }: { exceptionId: number; reason: string }) =>
      apiClient.post<TimesheetExceptionRecord>(
        `/timesheets/exceptions/${exceptionId}/resolve`,
        { reason },
      ),
    onSuccess: () => {
      invalidateExceptionQueries(qc);
      toast.success("Exception resolved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDismissException() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "exceptions", "dismiss"],
    mutationFn: ({ exceptionId, reason }: { exceptionId: number; reason: string }) =>
      apiClient.post<TimesheetExceptionRecord>(
        `/timesheets/exceptions/${exceptionId}/dismiss`,
        { reason },
      ),
    onSuccess: () => {
      invalidateExceptionQueries(qc);
      toast.success("Exception dismissed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRunExceptionDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "exceptions", "run-detection"],
    mutationFn: () =>
      apiClient.post<RunDetectionResult>("/timesheets/exceptions/run-detection"),
    onSuccess: (res) => {
      invalidateExceptionQueries(qc);
      toast.success(
        res.created > 0
          ? `Detection complete — ${res.created} new exception${res.created === 1 ? "" : "s"} found`
          : "Detection complete — no new exceptions",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
