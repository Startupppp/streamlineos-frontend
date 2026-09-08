"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { StockReservationStatus } from "@/types/inventory";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ReservationsFilters {
  sourceType?: string;
  status?: StockReservationStatus;
  variantId?: number;
  warehouseId?: number;
  page?: number;
  limit?: number;
}

export interface ReservationApiItem {
  id: number;
  orgId: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  productVariantId: number;
  warehouseId: number | null;
  locationId: number | null;
  lotId: number | null;
  serialId: number | null;
  reservedQty: string;
  status: string;
  idempotencyKey: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  productVariant?: { id: number; name: string; sku: string };
  location?: { id: number; name: string; code: string };
  warehouse?: { id: number; name: string };
}

interface ReservationsResult {
  items: ReservationApiItem[];
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
const successContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.successContract),
);
const stockEngineResultContract = lazyContract(() =>
  import("@/hooks/api/inventory/stock-schema").then((m) => m.stockEngineResultContract),
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
  return useAuthorizedMutation<{ success: true }, Error, number>("inventory:stock:reserve", {
    mutationKey: ["inventory", "stock", "release-reservation"],
    mutationFn: (reservationId) =>
      apiClient.post<{ success: true }>("/inventory/stock/release-reservation", { reservationId }, undefined, successContract),
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
      }, stockEngineResultContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}
