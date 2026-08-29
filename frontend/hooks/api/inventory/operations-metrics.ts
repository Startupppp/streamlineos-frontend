"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/** The endpoint's exact `@RequirePermission` key. */
export const THROUGHPUT_READ_KEY = "inventory:reports:read";

export interface ThroughputWindow {
  from: string;
  to: string;
}

export interface ThroughputReceiving {
  receipts: number;
  lines: number;
  discrepancyLines: number;
  /** Share of received lines that did not match, 0-1. */
  discrepancyRate: number;
}

export interface ThroughputPicking {
  linesTotal: number;
  linesConfirmed: number;
  exceptionLines: number;
  exceptionRate: number;
  wavesCompleted: number;
}

export interface ThroughputShipping {
  shipped: number;
  delivered: number;
  /** Median hours from dispatch to the carrier's delivered scan. */
  medianTransitHours: number | null;
}

export interface ThroughputMetrics {
  window: ThroughputWindow;
  receiving: ThroughputReceiving;
  picking: ThroughputPicking;
  shipping: ThroughputShipping;
}

/**
 * B10 — `GET /inventory/reports/throughput`.
 *
 * Every figure is already scoped to the warehouses the caller is assigned to:
 * receiving through its location, picking and shipping through their warehouse
 * column, all via the same `WarehouseScopeService` predicate. A supervisor of one
 * site therefore reads their own site's discrepancy rate rather than the
 * organisation's, and a user assigned no warehouse reads zeros rather than
 * everybody's — which the UI has to say out loud, because zeros and "you have no
 * sites" look identical on a card.
 *
 * Slow-list tier: a day's throughput does not move minute to minute, and this is
 * three aggregate scans over the ledger.
 */
export function useThroughputMetrics(
  window: ThroughputWindow,
  options?: Omit<UseQueryOptions<ThroughputMetrics, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan(THROUGHPUT_READ_KEY);
  return useQuery<ThroughputMetrics, Error>({
    queryKey: queryKeys.inventoryOps.throughput({ from: window.from, to: window.to }),
    queryFn: () =>
      apiClient.get<ThroughputMetrics>("/inventory/reports/throughput", {
        from: window.from,
        to: window.to,
      }),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
