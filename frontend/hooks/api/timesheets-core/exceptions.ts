"use client";

import { useInfiniteQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CursorPage } from "@/features/timesheets/types";
import type {
  ExceptionsQueryInput,
  ExceptionsSummary,
  RunDetectionResult,
  TimesheetException,
  TimesheetExceptionRecord,
} from "@/features/timesheets/exception-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const exceptionsListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-exception-schema").then((m) => m.exceptionsListResponseContract),
);
const exceptionsSummaryC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-exception-schema").then((m) => m.exceptionsSummaryResponseContract),
);
const exceptionResolutionC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-exception-schema").then((m) => m.exceptionResolutionResponseContract),
);
const detectorC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-exception-schema").then((m) => m.detectorResponseContract),
);

const exceptionsListPrefix = usersAndCommerceQueryKeys.timesheets
  .exceptions(undefined)
  .slice(0, -1);

function invalidateExceptionQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: exceptionsListPrefix });
  void qc.invalidateQueries({
    queryKey: usersAndCommerceQueryKeys.timesheets.exceptionsSummary(),
  });
}

export function useTimesheetExceptions(
  query: ExceptionsQueryInput = {},
  enabled = true,
) {
  const canView = useCan("timesheets:exceptions:view");
  const filters = {
    status: query.status,
    severity: query.severity,
    rule: query.rule,
    userId: query.userId,
    limit: query.limit ?? 50,
  };
  return useInfiniteQuery<CursorPage<TimesheetException>>({
    queryKey: usersAndCommerceQueryKeys.timesheets.exceptions(filters),
    queryFn: ({ pageParam , signal }) => {
      const params: ExceptionsQueryInput = {
        status: filters.status,
        severity: filters.severity,
        rule: filters.rule,
        userId: filters.userId,
        limit: filters.limit,
      };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<CursorPage<TimesheetException>>(
        "/timesheets/exceptions",
        params, signal, exceptionsListC,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useExceptionsSummary(enabled = true) {
  return useGatedQuery("timesheets:exceptions:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.exceptionsSummary(),
    queryFn: ({ signal }) =>
      apiClient.get<ExceptionsSummary>("/timesheets/exceptions/summary", undefined, signal, exceptionsSummaryC),
    staleTime: 60_000,
    enabled,
  });
}

export function useResolveException() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:exceptions:manage", {
    mutationKey: ["timesheets", "exceptions", "resolve"],
    mutationFn: ({ exceptionId, reason }: { exceptionId: number; reason: string }) =>
      apiClient.post<TimesheetExceptionRecord>(
        `/timesheets/exceptions/${exceptionId}/resolve`,
        { reason },
        undefined,
        exceptionResolutionC,
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
  return useAuthorizedMutation("timesheets:exceptions:manage", {
    mutationKey: ["timesheets", "exceptions", "dismiss"],
    mutationFn: ({ exceptionId, reason }: { exceptionId: number; reason: string }) =>
      apiClient.post<TimesheetExceptionRecord>(
        `/timesheets/exceptions/${exceptionId}/dismiss`,
        { reason },
        undefined,
        exceptionResolutionC,
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
  return useAuthorizedMutation("timesheets:exceptions:manage", {
    mutationKey: ["timesheets", "exceptions", "run-detection"],
    mutationFn: () =>
      apiClient.post<RunDetectionResult>("/timesheets/exceptions/run-detection", undefined, undefined, detectorC),
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
