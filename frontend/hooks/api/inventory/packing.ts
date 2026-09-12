"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

/** Exactly the shape `GET /inventory/packages/queue` returns. */
export interface PackingQueueRow {
  soId: number;
  soNumber: string;
  status: string;
  orderDate: string;
  warehouseId: number | null;
  customerName: string | null;
  pickedQuantity: string;
  packedQuantity: string;
  packageCount: number;
  openPackageCount: number;
  openPackageId: number | null;
  fullyPacked: boolean;
}

export interface PackingQueueResponse {
  items: PackingQueueRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PackingReconciliationLine {
  productVariantId: number;
  quantity: string;
}

export interface PackingReconciliation {
  soId: number | null;
  picked: PackingReconciliationLine[];
  packed: PackingReconciliationLine[];
  outstanding: PackingReconciliationLine[];
}

export interface CartonCandidate {
  cartonTypeId: number;
  code: string;
  name: string;
  capacityWeightGrams: number;
  capacityVolumeMm3: number;
  fits: boolean;
  reasons: string[];
}

export interface CartonSuggestion {
  totalWeightGrams: number;
  totalVolumeMm3: number;
  unmeasuredVariantIds: number[];
  recommended: CartonCandidate | null;
  candidates: CartonCandidate[];
}

interface PackingQueueParams {
  [key: string]: unknown;
  warehouseId?: number;
  page?: number;
  limit?: number;
}

/**
 * The bench's own queue: cartons and picked quantities, not sales-order status.
 *
 * Volatile tier — several packers work the same list and an order leaves it the
 * moment its last unit is in a box.
 */
export function usePackingQueue(params?: PackingQueueParams) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<PackingQueueResponse, Error>({
    queryKey: queryKeys.packing.queue(params),
    queryFn: ({ signal }) =>
      apiClient.get<PackingQueueResponse>("/inventory/packages/queue", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 15_000,
    enabled: canView,
  });
}

export function usePackageReconciliation(
  packageId: number,
  options?: Omit<UseQueryOptions<PackingReconciliation, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<PackingReconciliation, Error>({
    queryKey: queryKeys.packing.reconciliation(packageId),
    queryFn: ({ signal }) =>
      apiClient.get<PackingReconciliation>(
        `/inventory/packages/${packageId}/reconciliation`,
        undefined,
        signal,
      ),
    staleTime: 15_000,
    ...options,
    enabled: canView && packageId > 0 && (options?.enabled ?? true),
  });
}

interface ScanIntoPackageVariables {
  packageId: number;
  scannedPayload?: string;
  productVariantId?: number;
  quantity?: string;
}

/**
 * The `Idempotency-Key` is generated per attempt rather than per item: a retry
 * of *this* scan must replay, and the packer's next scan of the same SKU must
 * not — it is a second physical unit going in the box.
 */
export function useScanIntoPackage() {
  const qc = useQueryClient();
  return useIdempotentMutation<PackingReconciliation, Error, ScanIntoPackageVariables>({
    mutationKey: ["inventory", "package", "scan"],
    mutationFn: ({ packageId, ...body }, idempotencyKey) =>
      apiClient.post<PackingReconciliation>(
        `/inventory/packages/${packageId}/scan`,
        body, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (data, variables) => {
      qc.setQueryData(queryKeys.packing.reconciliation(variables.packageId), data);
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(variables.packageId) });
    },
  });
}

/**
 * INV-206, wired at last. Advisory: it reports what plausibly fits and why
 * anything does not, and does not claim to have solved three-dimensional
 * packing.
 */
export function useSuggestCarton() {
  return useAuthorizedMutation<
    CartonSuggestion,
    Error,
    { lines: { productVariantId: number; quantity: number }[] }
  >("inventory:shipments:manage", {
    mutationKey: ["inventory", "cartonization", "suggest"],
    mutationFn: (body) => apiClient.post<CartonSuggestion>("/inventory/cartonization/suggest", body),
  });
}
