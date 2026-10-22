"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export const THROUGHPUT_READ_KEY = "inventory:reports:read";

export interface ThroughputWindow {
  from: string;
  to: string;
}

export interface ThroughputReceiving {
  receipts: number;
  lines: number;
  discrepancyLines: number;
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
  medianTransitHours: number | null;
}

export interface ThroughputMetrics {
  window: ThroughputWindow;
  receiving: ThroughputReceiving;
  picking: ThroughputPicking;
  shipping: ThroughputShipping;
}

export function useThroughputMetrics(
  window: ThroughputWindow,
  options?: Omit<UseQueryOptions<ThroughputMetrics, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan(THROUGHPUT_READ_KEY);
  return useQuery<ThroughputMetrics, Error>({
    queryKey: queryKeys.inventoryOps.throughput({ from: window.from, to: window.to }),
    queryFn: ({ signal }) =>
      apiClient.get<ThroughputMetrics>("/inventory/reports/throughput", {
        from: window.from,
        to: window.to,
      }, signal),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}


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
    queryFn: ({ signal }) =>
      apiClient.get<WorkAging>("/inventory/reports/work-aging", {
        warehouseId: query.warehouseId,
        asOf: query.asOf,
      }, signal),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
