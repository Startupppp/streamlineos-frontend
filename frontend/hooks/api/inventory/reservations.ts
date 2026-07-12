"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  return useQuery<ReservationsResult, Error>({
    queryKey: queryKeys.inventory.reservations(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<ReservationsResult>("/inventory/stock/reservations", {
        ...(filters?.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.variantId ? { variantId: filters.variantId } : {}),
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 50,
      }),
    staleTime: 30_000,
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["inventory", "stock", "release-reservation"],
    mutationFn: (reservationId) =>
      apiClient.post<void>("/inventory/stock/release-reservation", { reservationId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.inventory.all, "reservations"] });
      qc.invalidateQueries({ queryKey: [...queryKeys.inventory.all, "stockLevels"] });
    },
  });
}

export function useOpeningStock() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, OpeningStockInput>({
    mutationKey: ["inventory", "stock", "opening"],
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/stock/opening", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.inventory.all, "stockLevels"] });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}
