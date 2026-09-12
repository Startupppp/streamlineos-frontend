"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CreateReportDefinitionInput,
  CreateReportScheduleInput,
  ReportDefinition,
  ReportDefinitionSummary,
  ReportNlProposal,
  ReportRunLogEntry,
  ReportSchedule,
  ReportingExplainResult,
  ReportingQueryDescription,
  ReportingRunResult,
  ReportingSource,
  RunReportDefinitionOverrides,
  UpdateReportDefinitionInput,
  UpdateReportScheduleInput,
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
    queryFn: ({ signal }) =>
      apiClient.get<ReportingSource[]>("/crm/reporting/sources", undefined, signal),
    staleTime: 30 * 60_000,
  });
}

export function useReportRun(description: ReportingQueryDescription | null) {
  return useGatedQuery("crm:reporting:run", {
    queryKey: queryKeys.crm.reportingRun(description),
    queryFn: ({ signal }) =>
      apiClient.post<ReportingRunResult>("/crm/reporting/run", { query: description }, { signal }),
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
    queryFn: ({ signal }) =>
      apiClient.get<ReportDefinitionSummary[]>("/crm/reporting/definitions", params, signal),
    staleTime: DEFINITIONS_STALE_MS,
  });
}

export function useReportDefinition(reportDefinitionId: string | null) {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingDefinition(reportDefinitionId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<ReportDefinition>(
        `/crm/reporting/definitions/${reportDefinitionId}`,
        undefined,
        signal,
      ),
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
    queryFn: ({ signal }) =>
      apiClient.post<ReportingRunResult>(
        `/crm/reporting/definitions/${reportDefinitionId}/run`,
        overrides ?? {},
        { signal },
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
    queryFn: ({ signal }) =>
      apiClient.post<ReportingExplainResult>(
        "/crm/reporting/explain",
        { query: description },
        { signal },
      ),
    enabled: description !== null,
    staleTime: 30 * 60_000,
  });
}

/**
 * `POST /crm/reporting/nl-propose` — a plain-language question, proposed as
 * a query description, never run.
 *
 * A mutation, not a query: asking spends a model call every time, so
 * re-asking the same words is a new request rather than a cache read — the
 * opposite choice from `useReportRun`, where re-asking the same DESCRIPTION
 * is exactly what a cache is for. Gated on `crm:reporting:manage`, matching
 * `useReportExplain`: the response's `preview` carries the same physical
 * table and column names.
 */
export function useReportNlPropose() {
  return useAuthorizedMutation<ReportNlProposal, Error, string>("crm:reporting:manage", {
    mutationKey: ["crm", "reporting", "nl-propose"],
    mutationFn: (question: string) =>
      apiClient.post<ReportNlProposal>("/crm/reporting/nl-propose", { question }),
  });
}

export function useReportRuns(params: { limit: number; offset: number }) {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingRuns(params),
    queryFn: ({ signal }) =>
      apiClient.get<ReportRunLogEntry[]>("/crm/reporting/runs", params, signal),
    staleTime: 30_000,
  });
}

export function useCreateReportDefinition() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:reporting:manage", {
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

  return useAuthorizedMutation("crm:reporting:manage", {
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

  return useAuthorizedMutation("crm:reporting:manage", {
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

/**
 * The timetable a saved report runs on.
 *
 * Read behind `view` and authored behind `manage`, matching the controller.
 * `run` is deliberately not required to author one: a schedule does not run
 * anything when it is created, it names whose authority the unattended run will
 * carry, and that person's `run` key is checked every time it fires.
 */
export function useReportSchedules() {
  return useGatedQuery("crm:reporting:view", {
    queryKey: queryKeys.crm.reportingSchedules(),
    queryFn: ({ signal }) =>
      apiClient.get<ReportSchedule[]>("/crm/reporting/schedules", undefined, signal),
    staleTime: 60_000,
  });
}

function useSchedulesInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.reportingSchedules() });
  };
}

export function useCreateReportSchedule() {
  const invalidate = useSchedulesInvalidate();

  return useAuthorizedMutation("crm:reporting:manage", {
    mutationKey: ["crm", "reporting", "schedules", "create"],
    mutationFn: (input: CreateReportScheduleInput) =>
      apiClient.post<ReportSchedule>("/crm/reporting/schedules", input),
    onSuccess: invalidate,
  });
}

export function useUpdateReportSchedule() {
  const invalidate = useSchedulesInvalidate();

  return useAuthorizedMutation("crm:reporting:manage", {
    mutationKey: ["crm", "reporting", "schedules", "update"],
    mutationFn: ({
      reportScheduleId,
      ...input
    }: UpdateReportScheduleInput & { reportScheduleId: string }) =>
      apiClient.patch<ReportSchedule>(
        `/crm/reporting/schedules/${reportScheduleId}`,
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteReportSchedule() {
  const invalidate = useSchedulesInvalidate();

  return useAuthorizedMutation("crm:reporting:manage", {
    mutationKey: ["crm", "reporting", "schedules", "delete"],
    mutationFn: ({ reportScheduleId }: { reportScheduleId: string }) =>
      apiClient.delete<{ deleted: boolean }>(
        `/crm/reporting/schedules/${reportScheduleId}`,
      ),
    onSuccess: invalidate,
  });
}
