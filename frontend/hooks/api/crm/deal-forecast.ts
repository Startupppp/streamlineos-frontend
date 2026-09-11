"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  DealForecastScore,
  DealForecastSummaryResponse,
  ForecastBasis,
  ForecastTrainingAttempt,
} from "@/types/crm/forecast";
import type {
  ForecastSnapshot,
  CaptureForecastSnapshotInput,
  OverrideForecastInput,
} from "@/types/crm";

export function useForecastSnapshots(params?: { period?: string; limit?: number }) {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: queryKeys.deals.forecastSnapshots(params as Record<string, unknown>),
    queryFn: () => apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCaptureForecastSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "forecast", "captureSnapshot"] as const,
    mutationFn: (input: CaptureForecastSnapshotInput) =>
      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

export function useOverrideForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "forecast", "override"] as const,
    mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>
      apiClient.patch<ForecastSnapshot>(`/deals/forecast/${snapshotId}/override`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

/**
 * The forecast, read from the server that computes it.
 *
 * `queryKeys.deals.forecast()` has existed for a while and five mutations
 * invalidate it, but nothing ever read it: the forecast page computed its own
 * weighted total in the browser from a hardcoded six-stage probability table.
 * That table is not the tenant's — an organisation with a stage called
 * `QUALIFYING` at 40% got a flat 0, and a tenant who changed `PROPOSAL` from 50
 * to 65 saw no difference — and it also cannot know anything a model learned.
 * This hook is the caller that key was written for.
 */
export function useDealForecast() {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.forecast(),
    queryFn: () => apiClient.get<DealForecastSummaryResponse>("/deals/forecast"),
    staleTime: 2 * 60_000,
  });
}

/**
 * The basis on its own, for surfaces that explain the forecast without needing
 * the pipeline behind it.
 */
export function useForecastModel() {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: queryKeys.deals.forecastModel(),
    queryFn: () => apiClient.get<ForecastBasis>("/deals/forecast/model"),
    staleTime: 5 * 60_000,
  });
}

/**
 * One deal's learned score, or null.
 *
 * Null is the ordinary answer, not an error: a tenant on the weighted arithmetic
 * has no scores at all, and a deal created since the last nightly pass has none
 * yet. The caller renders the weighted figure in both cases, which is what it
 * was already rendering.
 */
export function useDealForecastScore(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.forecastScore(dealId),
    queryFn: () =>
      apiClient.get<{ score: DealForecastScore | null }>(`/deals/forecast/deals/${dealId}`),
    select: (payload) => payload.score,
    staleTime: 5 * 60_000,
    enabled: dealId > 0,
  });
}

/**
 * Fit a model now.
 *
 * A run that fits a model and then refuses to store it resolves rather than
 * rejects — `trained: false` with a reason is the answer, not a failure — so the
 * caller must branch on the payload and not on `isError`. Treating a refusal as
 * an error would tell somebody the system broke when what happened is that it
 * declined to replace a number they understand with one that was not better.
 */
export function useTrainForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "forecast", "train"] as const,
    mutationFn: () => apiClient.post<ForecastTrainingAttempt>("/deals/forecast/train", {}),
    onSuccess: (attempt) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastModel() });
      if (!attempt.trained) return;
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}
