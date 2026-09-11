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

/**
 * Call intelligence: one call's analysis, and the team digest over many.
 *
 * The read never spends an AI credit and the run may. They are separate hooks
 * for the same reason they are separate routes and separate permissions — a
 * timeline that rendered twenty calls through an analyse-on-miss read would
 * spend twenty credits on a page load.
 */

/**
 * The stored analysis for one call. Never analyses.
 *
 * A 404 here means nobody has run it; a 422 means the consent rule refuses this
 * call and retrying will never change that. Callers should tell those apart
 * rather than offering "try again" for both.
 */
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
    /**
     * A missing analysis and a refused one are both terminal answers, not
     * transient failures — retrying either just repeats the same question.
     */
    retry: false,
  });
}

/**
 * Analyse a call, or hand back the answer this transcript already has.
 *
 * `cached: false` in the response is how the caller learns this cost something;
 * it is not inferable from the status code, which is 200 either way.
 */
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
      // A new analysis joins the cohort the digest is computed over.
      void qc.invalidateQueries({ queryKey: queryKeys.crmCallIntelligence.all });
    },
  });
}

/**
 * The rep hands their own analysis over before the private window elapses.
 *
 * Gated on the ordinary view key, not a key of its own: a separate one would be
 * revocable, and an administrator able to stop a rep sharing their own call
 * inverts the rule the private window exists to establish. What stops one person
 * releasing another's call is the server comparing the caller to the rep.
 */
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

/**
 * The manager's coaching digest over a trailing window.
 *
 * `crm:call-analysis:view-team`, which stops at the two admin rungs — the key is
 * spelled `view-team` rather than `team-view` precisely so the backend's
 * seed-every-`:view`-key rule does not hand it to every rep.
 */
export function useCoachingDigest(sinceDays = 30) {
  return useGatedQuery("crm:call-analysis:view-team", {
    queryKey: queryKeys.crmCallIntelligence.coaching(sinceDays),
    queryFn: ({ signal }) =>
      apiClient.get<CoachingDigestResponse>("/crm/calls/coaching", { sinceDays }, signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * CRM-P2-05. Per-rep metrics and trends over a trailing window.
 *
 * Gated on `crm:call-analysis:view` and not on `:view-team`, matching the route.
 * Every CRM member holds the view key, so a rep can open their own trend; the
 * server decides per call whether anybody else's appear, using the same rule the
 * per-call route applies. Gating this hook on the team key instead would make
 * "how am I doing on calls" a manager-only question, which is the surveillance
 * reading of a coaching tool.
 *
 * `staleTime` is the slow-list tier: this is an aggregate over a period and it
 * does not move between two clicks of a window tab.
 */
export function useCallRepMetrics(params: { sinceDays: number; page: number; limit: number }) {
  return useGatedQuery("crm:call-analysis:view", {
    queryKey: queryKeys.crmCallIntelligence.reps(params),
    queryFn: ({ signal }) =>
      apiClient.get<RepCallMetricsResponse>("/crm/calls/reps", params, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * CRM-P2-06. The calls that exemplify one metric, best first.
 *
 * `metric` is required here exactly as it is on the route: "best calls" with no
 * stated definition of best is a ranking nobody asked for. The server drops
 * calls the consent rule refuses and calls still inside another rep's private
 * window before ranking, so this hook can render whatever it is given.
 */
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
