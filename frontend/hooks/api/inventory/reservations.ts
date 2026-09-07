"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { StockReservation, StockReservationStatus } from "@/types/inventory";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

const listReservationsContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.listReservationsContract),
);
const createReservationContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.createReservationContract),
);

export function useReservations(filters?: ReservationsFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ReservationsResult, Error>({
    queryKey: queryKeys.inventory.reservations(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<ReservationsResult>("/inventory/stock/reservations", {
        ...(filters?.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.variantId ? { variantId: filters.variantId } : {}),
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters?.page !== undefined ? { page: filters.page } : {}),
        ...(filters?.limit !== undefined ? { limit: filters.limit } : {}),
      }, signal, listReservationsContract),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("inventory:stock:reserve", {
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
  return useAuthorizedMutation<unknown, Error, OpeningStockInput>("inventory:stock:adjust", {
    mutationKey: ["inventory", "stock", "opening"],
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/stock/opening", data, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}
