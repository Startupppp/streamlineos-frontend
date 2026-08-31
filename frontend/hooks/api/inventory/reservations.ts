"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { StockReservation, StockReservationStatus } from "@/types/inventory";

interface ReservationsFilters {
  sourceType?: string;
  status?: StockReservationStatus;
  variantId?: number;
  warehouseId?: number;
  page?: number;
  limit?: number;
}

interface ReservationsResult {
  items: StockReservation[];
  total: number;
  page: number;
  totalPages: number;
}

interface OpeningStockLine {
  productVariantId: number;
  locationId: number;
  qty: number;
  unitCost?: number;
}

interface OpeningStockInput {
  lines: OpeningStockLine[];
  notes?: string;
}

export function useReservations(filters?: ReservationsFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ReservationsResult, Error>({
    queryKey: queryKeys.inventory.reservations(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<ReservationsResult>("/inventory/stock/reservations", {
        ...(filters?.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.variantId ? { variantId: filters.variantId } : {}),
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters?.page !== undefined ? { page: filters.page } : {}),
        ...(filters?.limit !== undefined ? { limit: filters.limit } : {}),
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["inventory", "stock", "release-reservation"],
    mutationFn: (reservationId) =>
      apiClient.post<void>("/inventory/stock/release-reservation", { reservationId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useOpeningStock() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, OpeningStockInput>({
    mutationKey: ["inventory", "stock", "opening"],
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/stock/opening", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}
