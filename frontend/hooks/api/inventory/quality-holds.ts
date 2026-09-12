"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { QualityHoldStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

/** Whose stock a movement or hold is against. Absent means OWNED. */
export type StockOwnership = "OWNED" | "VENDOR" | "CUSTOMER";

interface QualityHold {
  id: number;
  orgId: string;
  status: QualityHoldStatus;
  productVariantId: number;
  locationId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  /**
   * NEO-4/NEO-11. The pallet the held units stand on, and whose stock they are.
   *
   * Both are part of `inv_stock_levels`' natural key, so a hold against a
   * consigned pallet and one against loose owned stock in the same bin are
   * different holds on different rows. Without them the list shows two
   * identical-looking rows and an operator cannot say which stock is held —
   * which is the question a hold exists to answer.
   */
  handlingUnitId?: number | null;
  ownership?: StockOwnership | null;
  quantity: string;
  reason: string;
  releasedBy?: string | null;
  releasedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  variantName?: string;
  variantSku?: string;
  productName?: string;
}

type HoldListResponse = {
  items: QualityHold[];
  total: number;
  page: number;
  totalPages: number;
};

export type { QualityHold };

interface QualityHoldsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  status?: QualityHoldStatus;
}

export function useQualityHolds(params?: QualityHoldsParams) {
  const canView = useCan("inventory:quality:read");
  return useQuery<HoldListResponse, Error>({
    queryKey: queryKeys.inventory.qualityHolds(params),
    queryFn: ({ signal }) =>
      apiClient.get<HoldListResponse>("/inventory/quality/holds", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityHold(holdId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<QualityHold, Error>({
    queryKey: queryKeys.inventory.qualityHold(holdId),
    queryFn: ({ signal }) =>
      apiClient.get<QualityHold>(`/inventory/quality/holds/${holdId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && holdId > 0,
  });
}

export function useCreateQualityHold() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    QualityHold,
    Error,
    { productVariantId: number; locationId: number; lotId?: number; serialId?: number; quantity: number; reason: string }
  >({
    mutationKey: ["inventory", "quality", "hold", "create"],
    mutationFn: ({ quantity, ...rest }, idempotencyKey) =>
      apiClient.post<QualityHold>(
        "/inventory/quality/holds",
        { ...rest, quantity: String(quantity) }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useReleaseQualityHold() {
  const qc = useQueryClient();
  return useIdempotentMutation<QualityHold, Error, number>({
    mutationKey: ["inventory", "quality", "hold", "release"],
    mutationFn: (holdId, idempotencyKey) =>
      apiClient.post<QualityHold>(
        `/inventory/quality/holds/${holdId}/release`,
        undefined, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, holdId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHold(holdId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}
