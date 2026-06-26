"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface MovementsFilters {
  warehouseId?: number;
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useInventoryDashboard() {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/reports/dashboard"),
    staleTime: 5 * 60_000,
  });
}

export function useStockSummary() {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.stockSummary(),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/reports/stock-summary"),
    staleTime: 5 * 60_000,
  });
}

export function useReorderReport() {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.reorderReport(),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/reports/reorder"),
    staleTime: 5 * 60_000,
  });
}

export function useMovementsReport(filters?: MovementsFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.movementsReport(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/reports/movements", {
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
        ...(filters?.productId ? { productId: String(filters.productId) } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 5 * 60_000,
  });
}
