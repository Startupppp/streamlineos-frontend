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
