"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface DriftWatchRow {
  forecastId: number;
  productVariantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  method: string | null;
  generatedAt: string;
  mae: string | null;
  rmse: string | null;
  bias: string | null;
  mase: string | null;
  demandMean: string;
  maeRatio: string | null;
  breachesThreshold: boolean;
  stale: boolean;
  ageDays: number;
  coverage: {
    periods: number;
    from: string;
    to: string;
    censoredPeriods: number;
    stockoutCensored: boolean;
  };
  applicable: boolean;
  refusalReason: string | null;
  storedVersions: number;
}

export interface DriftSummary {
  tracked: number;
  breaching: number;
  stale: number;
  refused: number;
  coverage: { variantsForecast: number; variantsTotal: number; percent: string };
  proposals: {
    total: number;
    accepted: number;
    acceptedPercent: string;
    refusals: number;
    overridden: number;
    overriddenPercent: string;
  };
}

export interface DriftWatchlistResponse {
  items: DriftWatchRow[];
  total: number;
  page: number;
  totalPages: number;
  threshold: number;
  summary: DriftSummary;
}

export interface ForecastAccuracyMetrics {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  mase: number | null;
}

export interface DriftReport {
  productVariantId: number;
  warehouseId: number | null;
  method: string | null;
  earlier: ForecastAccuracyMetrics | null;
  recent: ForecastAccuracyMetrics | null;
  maeRatio: number | null;
  status: "stable" | "degrading" | "improving" | "insufficient_data";
  championChanged: boolean;
  previousChampion?: string;
  findings: string[];
}

export interface DriftEvidenceVersion {
  id: number;
  generatedAt: string;
  method: string | null;
  historyWeeks: number;
  horizonWeeks: number;
  periods: number;
  coverage: { from: string; to: string };
  metrics: { mae: string; rmse: string; bias: string; mase: string | null } | null;
  applicable: boolean;
  refusalReason: string | null;
}

export interface DriftDetail {
  report: DriftReport;
  evidence: {
    productVariantId: number;
    warehouseId: number | null;
    totalVersions: number;
    versions: DriftEvidenceVersion[];
  };
}

interface DriftWatchlistParams {
  [key: string]: unknown;
  warehouseId?: number;
  maeRatioThreshold?: number;
  breachingOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useDriftWatchlist(params?: DriftWatchlistParams) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<DriftWatchlistResponse, Error>({
    queryKey: queryKeys.inventoryPlanning.driftWatchlist(params),
    queryFn: () =>
      apiClient.get<DriftWatchlistResponse>("/inventory/replenishment/drift", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.maeRatioThreshold !== undefined
          ? { maeRatioThreshold: String(params.maeRatioThreshold) }
          : {}),
        ...(params?.breachingOnly ? { breachingOnly: "true" } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDriftDetail(
  productVariantId: number | null,
  params?: { warehouseId?: number },
  options?: Omit<UseQueryOptions<DriftDetail, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<DriftDetail, Error>({
    queryKey: queryKeys.inventoryPlanning.driftDetail(productVariantId ?? 0, params),
    queryFn: () =>
      apiClient.get<DriftDetail>(`/inventory/replenishment/drift/${productVariantId}`, {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canRead && productVariantId !== null && (options?.enabled ?? true),
  });
}
