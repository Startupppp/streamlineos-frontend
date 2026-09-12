"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface WarehousePosition {
  warehouseId: number;
  warehouseName: string;
  onHand: string;
  committed: string;
  available: string;
  weeklyDemand: number;
  weeksOfCover: number | null;
}

export interface TransferRecommendation {
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  quantity: number;
  coverAfter: { from: number | null; to: number | null };
  rationale: string;
}

export interface TransferPlan {
  productVariantId: number;
  positions: WarehousePosition[];
  recommendations: TransferRecommendation[];
  caveats: string[];
}

export interface SourceAllocation {
  lotId: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
  quantity: string;
}

export interface ApprovedTransfer {
  transferId: number;
  referenceNumber: string;
  productVariantId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  fromLocationId: number;
  toLocationId: number;
  quantity: string;
  allocations: SourceAllocation[];
  status: string;
  created: boolean;
}

/** The move, never the amount — the server re-derives the quantity. */
export interface ApproveTransferInput {
  productVariantId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  notes?: string;
}

export function useTransferPlan(
  productVariantId: number | null,
  options?: Omit<UseQueryOptions<TransferPlan, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<TransferPlan, Error>({
    queryKey: queryKeys.inventoryPlanning.transferPlan(productVariantId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<TransferPlan>(
        `/inventory/replenishment/transfer-recommendations/${productVariantId}`,
        undefined,
        signal,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canRead && productVariantId !== null && (options?.enabled ?? true),
  });
}

/**
 * A fresh `Idempotency-Key` per attempt, not per recommendation.
 *
 * A retry of a failed approve is a new attempt and must be allowed to run; a
 * double-click within one attempt shares the key and replays the first
 * transfer, which is exactly the behaviour the backend guarantees.
 */
export function useApproveTransferRecommendation() {
  const qc = useQueryClient();
  return useIdempotentMutation<ApprovedTransfer, Error, ApproveTransferInput>({
    mutationKey: ["inventory", "planning", "transfer-recommendation", "approve"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<ApprovedTransfer>(
        "/inventory/replenishment/transfer-recommendations/approve",
        input, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventoryPlanning.transferPlan(variables.productVariantId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
    },
  });
}
