"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeys } from "@/lib/query-keys";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
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

const dealForecastSnapshotsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotsContract));
const dealForecastCompareLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastCompareContract));
const dealForecastSnapshotLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotContract));

export function useForecastSnapshots(params?: { period?: string; limit?: number }) {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: queryKeys.deals.forecastSnapshots(params),
    queryFn: ({ signal }) => apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params, signal, dealForecastSnapshotsLazy),
    staleTime: 2 * 60_000,
  });
}

export interface ForecastCompare {
  period: string;
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  delta: { totalWeighted: number; totalBestCase: number; totalDeals: number };
}

export function useForecastCompare(period: string | null) {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: customerWorkQueryKeys.deals.forecastCompare(period ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<ForecastCompare>("/deals/forecast/compare", { period }, signal, dealForecastCompareLazy),
    staleTime: 60_000,
    enabled: !!period,
  });
}

export function useCaptureForecastSnapshot() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:forecast", {
    mutationKey: ["deals", "forecast", "captureSnapshot"] as const,
    mutationFn: (input: CaptureForecastSnapshotInput) =>
      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input, undefined, dealForecastSnapshotLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

export function useOverrideForecast() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:manage", {
    mutationKey: ["deals", "forecast", "override"] as const,
    mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>
      apiClient.patch<ForecastSnapshot>(`/deals/forecast/${snapshotId}/override`, data, undefined, dealForecastSnapshotLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

export function useDealForecast() {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.forecast(),
    queryFn: ({ signal }) =>
      apiClient.get<DealForecastSummaryResponse>("/deals/forecast", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useForecastModel() {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: queryKeys.deals.forecastModel(),
    queryFn: ({ signal }) =>
      apiClient.get<ForecastBasis>("/deals/forecast/model", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useDealForecastScore(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.forecastScore(dealId),
    queryFn: ({ signal }) =>
      apiClient.get<{ score: DealForecastScore | null }>(
        `/deals/forecast/deals/${dealId}`,
        undefined,
        signal,
      ),
    select: (payload) => payload.score,
    staleTime: 5 * 60_000,
    enabled: dealId > 0,
  });
}

export function useTrainForecast() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:manage", {
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
