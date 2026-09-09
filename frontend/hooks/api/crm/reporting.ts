"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CreateReportDefinitionInput,
  ReportDefinition,
  ReportDefinitionSummary,
  ReportRunLogEntry,
  ReportingExplainResult,
  ReportingQueryDescription,
  ReportingRunResult,
  ReportingSource,
  RunReportDefinitionOverrides,
  UpdateReportDefinitionInput,
} from "@/types/crm/reporting";

/**
 * `GET /crm/reporting/sources` and `POST /crm/reporting/run`.
 *
 * Both gate on `crm:reporting:run`, which is what the controller declares on
 * each — `sources` sits behind `run` rather than `view` because the list it
 * returns is already filtered to what this caller could execute, and a reader
 * who can run nothing would get an empty list that reads as a bug.
 *
 * Running is a POST because a description does not fit in a query string, and
 * it is still a read: the response is the answer, and re-asking the same
 * question is the thing a cache is for. It is therefore a query, keyed on the
 * description, not a mutation.
 */

export function useReportingSources() {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingSources(),
    queryFn: () => apiClient.get<ReportingSource[]>("/crm/reporting/sources"),
    staleTime: 30 * 60_000,
  });
}

export function useReportRun(description: ReportingQueryDescription | null) {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingRun(description),
    queryFn: () =>
      apiClient.post<ReportingRunResult>("/crm/reporting/run", { query: description }),
    enabled: description !== null,
    staleTime: 2 * 60_000,
  });
}

/**
 * The saved half of the module.
 *
 * Three keys, and the split is the controller's, restated here so a hook cannot
 * quietly gate on the wrong one. `view` reads what exists — the saved reports
 * and the log of what has been run — and is the auditor's key: it is grantable
 * on its own precisely because neither read returns tenant data. `manage`
 * authors, and `explain` sits there too because the statement it returns names
 * physical tables. `run` executes, and is the only one with a cost.
 */

const DEFINITIONS_STALE_MS = 60_000;

export function useReportDefinitions(params: { limit: number; offset: number }) {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingDefinitions(params),
    queryFn: () =>
      apiClient.get<ReportDefinitionSummary[]>("/crm/reporting/definitions", params),
    staleTime: DEFINITIONS_STALE_MS,
  });
}

export function useReportDefinition(reportDefinitionId: string | null) {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingDefinition(reportDefinitionId ?? ""),
    queryFn: () =>
      apiClient.get<ReportDefinition>(`/crm/reporting/definitions/${reportDefinitionId}`),
    enabled: reportDefinitionId !== null,
    staleTime: DEFINITIONS_STALE_MS,
  });
}

/**
 * Running a saved report by its id rather than by its description.
 *
 * The two routes execute the same statement, so this is not a shortcut: the
 * audit row `definitions/:id/run` writes carries the definition id, and the one
 * `run` writes does not. Sending a saved report down the ad-hoc path would
 * leave "how often is this report run, and by whom" permanently unanswerable.
 *
 * `limit` and `offset` travel as overrides because paging a saved report is not
 * a new question — the stored description is unchanged and the server merges
 * them in before compiling, rather than patching finished SQL.
 */
export function useReportDefinitionRun(
  reportDefinitionId: string | null,
  overrides: RunReportDefinitionOverrides | null,
) {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingDefinitionRun(reportDefinitionId ?? "", overrides),
    queryFn: () =>
      apiClient.post<ReportingRunResult>(
        `/crm/reporting/definitions/${reportDefinitionId}/run`,
        overrides ?? {},
      ),
    enabled: reportDefinitionId !== null && overrides !== null,
    staleTime: 2 * 60_000,
  });
}

/**
 * What the description would execute, executing nothing.
 *
 * Behind `manage` rather than `run`, matching the controller: the compiled
 * statement names physical tables and columns, which is more than a report
 * reader needs to know.
 */
export function useReportExplain(description: ReportingQueryDescription | null) {
  return useGatedQuery("crm:reporting:manage", {
    queryKey: queryKeys.crm.reportingExplain(description),
    queryFn: () =>
      apiClient.post<ReportingExplainResult>("/crm/reporting/explain", { query: description }),
    enabled: description !== null,
    staleTime: 30 * 60_000,
  });
}

export function useReportRuns(params: { limit: number; offset: number }) {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingRuns(params),
    queryFn: () => apiClient.get<ReportRunLogEntry[]>("/crm/reporting/runs", params),
    staleTime: 30_000,
  });
}

export function useCreateReportDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["crm", "reporting", "definitions", "create"],
    mutationFn: (input: CreateReportDefinitionInput) =>
      apiClient.post<ReportDefinition>("/crm/reporting/definitions", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.reportingDefinitionsAll(),
      });
    },
  });
}

export function useUpdateReportDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["crm", "reporting", "definitions", "update"],
    mutationFn: ({
      reportDefinitionId,
      ...input
    }: UpdateReportDefinitionInput & { reportDefinitionId: string }) =>
      apiClient.patch<ReportDefinition>(
        `/crm/reporting/definitions/${reportDefinitionId}`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.reportingDefinitionsAll(),
      });
    },
  });
}

export function useDeleteReportDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["crm", "reporting", "definitions", "delete"],
    mutationFn: ({ reportDefinitionId }: { reportDefinitionId: string }) =>
      apiClient.delete<{ deleted: boolean }>(
        `/crm/reporting/definitions/${reportDefinitionId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.reportingDefinitionsAll(),
      });
    },
  });
}
