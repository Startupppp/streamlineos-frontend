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


/** B10 — one age band of open work. `oldestHours` is null when the band is empty. */
export interface AgeBand {
  label: "0-4h" | "4-24h" | "24-72h" | "72h+";
  count: number;
  oldestHours: number | null;
}

export interface WorkAgingLane {
  open: number;
  bands: AgeBand[];
}

export interface WorkAging {
  asOf: string;
  /**
   * B10 — the three answers this field carries, and why it is not a boolean.
   *
   * `null` — the reader holds `inventory:warehouses:scope-all`, so the numbers
   * are the whole estate.
   * `[1, 4]` — the reader is assigned those warehouses and the numbers are theirs.
   * `[]` — the reader is assigned **no** warehouse. Every count is zero, and
   * that zero means something entirely different from an idle warehouse.
   *
   * The existing throughput report conflates the last two, which is the defect
   * this array exists to let the aging section avoid: "you are assigned no
   * warehouse" and "there is nothing to do" look identical on a card, and only
   * one of them is somebody's problem to fix.
   */
  scopedWarehouseIds: number[] | null;
  receipts: WorkAgingLane;
  putaway: WorkAgingLane;
  picking: WorkAgingLane;
  pickExceptions: WorkAgingLane;
  shipping: WorkAgingLane;
}

export interface WorkAgingQuery {
  warehouseId?: number;
  asOf?: string;
}

/**
 * B10 — how old the open work is, which throughput cannot say.
 *
 * Throughput answers "how much moved in this window". It cannot answer "what has
 * been sitting here since Tuesday", because a lane that processes a hundred lines
 * a day and has one receipt stuck for a week looks healthy by volume. The bands
 * are the part a supervisor acts on.
 *
 * Same permission and the same slow-list tier as throughput: this is aggregate
 * scans over open work, and it does not move minute to minute.
 */
export function useWorkAging(
  query: WorkAgingQuery = {},
  options?: Omit<UseQueryOptions<WorkAging, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan(THROUGHPUT_READ_KEY);
  return useQuery<WorkAging, Error>({
    queryKey: queryKeys.inventoryOps.workAging({
      warehouseId: query.warehouseId,
      asOf: query.asOf,
    }),
    queryFn: () =>
      apiClient.get<WorkAging>("/inventory/reports/work-aging", {
        warehouseId: query.warehouseId,
        asOf: query.asOf,
      }),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
