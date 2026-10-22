"use client";

import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CallAnalysisReleaseResponse,
  CallAnalysisResponse,
  CallExemplarsResponse,
  CoachingDigestResponse,
  ExemplarMetric,
  RepCallMetricsResponse,
} from "@/types/crm/call-intelligence";


export function useCallAnalysis(activityId: string) {
  return useGatedQuery("crm:call-analysis:view", {
    queryKey: queryKeys.crmCallIntelligence.analysis(activityId),
    queryFn: ({ signal }) =>
      apiClient.get<CallAnalysisResponse>(
        `/crm/calls/${activityId}/analysis`,
        undefined,
        signal,
      ),
    staleTime: 5 * 60_000,
    enabled: activityId.length > 0,
    retry: false,
  });
}

export function useRunCallAnalysis() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:call-analysis:run", {
    mutationKey: ["crm", "call-intelligence", "run"],
    mutationFn: (activityId: string) =>
      apiClient.post<CallAnalysisResponse>(`/crm/calls/${activityId}/analysis`, {}),
    onSuccess: (_result, activityId) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.crmCallIntelligence.analysis(activityId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.crmCallIntelligence.all });
    },
  });
}

export function useReleaseCallAnalysis() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:call-analysis:view", {
    mutationKey: ["crm", "call-intelligence", "release"],
    mutationFn: ({ activityId, note }: { activityId: string; note?: string }) =>
      apiClient.post<CallAnalysisReleaseResponse>(
        `/crm/calls/${activityId}/analysis/release`,
        note === undefined ? {} : { note },
      ),
    onSuccess: (_result, { activityId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.crmCallIntelligence.analysis(activityId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.crmCallIntelligence.all });
    },
  });
}

export function useCoachingDigest(sinceDays = 30) {
  return useGatedQuery("crm:call-analysis:view-team", {
    queryKey: queryKeys.crmCallIntelligence.coaching(sinceDays),
    queryFn: ({ signal }) =>
      apiClient.get<CoachingDigestResponse>("/crm/calls/coaching", { sinceDays }, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCallRepMetrics(params: { sinceDays: number; page: number; limit: number }) {
  return useGatedQuery("crm:call-analysis:view", {
    queryKey: queryKeys.crmCallIntelligence.reps(params),
    queryFn: ({ signal }) =>
      apiClient.get<RepCallMetricsResponse>("/crm/calls/reps", params, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCallExemplars(params: {
  metric: ExemplarMetric;
  sinceDays: number;
  page: number;
  limit: number;
}) {
  return useGatedQuery("crm:call-analysis:view", {
    queryKey: queryKeys.crmCallIntelligence.exemplars(params),
    queryFn: ({ signal }) =>
      apiClient.get<CallExemplarsResponse>("/crm/calls/exemplars", params, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
