"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * The two routes that make transit a place goods can leave.
 *
 * `dispatchTransfer` parks goods at the source warehouse's TRANSIT location and
 * a short receipt takes only what arrived off it. Everything else stays there —
 * on hand, unsellable, and until these routes existed with no command anywhere
 * that could move it. Both were mounted on the backend and neither was called
 * from this repo, so the queue was invisible and the decision unreachable.
 */

export const TRANSIT_EXIT_DISPOSITIONS = ["RETURN_TO_SOURCE", "WRITE_OFF"] as const;
export type TransitExitDisposition = (typeof TRANSIT_EXIT_DISPOSITIONS)[number];

/** `view` names the two questions a warehouse asks, so the client never derives "stranded". */
export type StrandedTransitView = "ANY" | "STRANDED";

/**
 * The row shape as the service returns it — snake_case, straight off the query.
 * Mapped once here so no component reads a database column name.
 */
interface RawStrandedTransitRow {
  transfer_id: number;
  reference_number: string | null;
  status: string;
  dispatched_at: string | null;
  transfer_line_id: number;
  product_variant_id: number;
  sku: string | null;
  variant_name: string | null;
  lot_id: number | null;
  lot_number: string | null;
  serial_id: number | null;
  quantity_dispatched: string;
  quantity_received: string;
  quantity_stranded: string;
  transit_location_id: number;
  transit_location_code: string | null;
  transit_warehouse_id: number;
  transit_on_hand: string;
  from_location_id: number;
  to_location_id: number | null;
}

export interface StrandedTransitRow {
  transferId: number;
  transferLineId: number;
  referenceNumber: string | null;
  status: string;
  dispatchedAt: string | null;
  productVariantId: number;
  sku: string | null;
  variantName: string | null;
  lotNumber: string | null;
  serialId: number | null;
  quantityDispatched: string;
  quantityReceived: string;
  quantityStranded: string;
  transitLocationCode: string | null;
  transitWarehouseId: number;
  transitOnHand: string;
}

export interface StrandedTransitResult {
  items: StrandedTransitRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StrandedTransitFilters {
  warehouseId?: number;
  view?: StrandedTransitView;
  page?: number;
  limit?: number;
}

export interface TransitExitInput {
  transferId: number;
  disposition: TransitExitDisposition;
  reason: string;
  lines?: Array<{ transferLineId: number; quantity?: string }>;
}

export interface TransitExitResult {
  transferId: number;
  disposition: TransitExitDisposition;
  transitLocationId: number;
  lines: Array<{ transferLineId: number; quantity: string }>;
  transactionIds: number[];
  transferStatus: string;
  strandedRemaining: string;
}

function toStrandedRow(row: RawStrandedTransitRow): StrandedTransitRow {
  return {
    transferId: row.transfer_id,
    transferLineId: row.transfer_line_id,
    referenceNumber: row.reference_number,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    productVariantId: row.product_variant_id,
    sku: row.sku,
    variantName: row.variant_name,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    quantityDispatched: row.quantity_dispatched,
    quantityReceived: row.quantity_received,
    quantityStranded: row.quantity_stranded,
    transitLocationCode: row.transit_location_code,
    transitWarehouseId: row.transit_warehouse_id,
    transitOnHand: row.transit_on_hand,
  };
}

export function useStrandedTransit(filters?: StrandedTransitFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<StrandedTransitResult, Error>({
    queryKey: queryKeys.inventoryTransit.stranded(filters as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.warehouseId) params.warehouseId = String(filters.warehouseId);
      if (filters?.view) params.view = filters.view;
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      const raw = await apiClient.get<{
        items: RawStrandedTransitRow[];
        total: number;
        page: number;
        totalPages: number;
      }>("/inventory/stock/transit/stranded", params);
      return {
        items: raw.items.map(toStrandedRow),
        total: raw.total,
        page: raw.page,
        totalPages: raw.totalPages,
      };
    },
    // A queue whose whole value is being current, read by somebody about to act
    // on it. Long enough not to refetch on every keystroke in the filter row.
    staleTime: 15_000,
    enabled: canView,
  });
}

/**
 * Both dispositions post movements, so the key has to survive a retry: an exit
 * that ran twice would take the quantity off transit twice, and the second pass
 * would eat another transfer's goods standing on the same warehouse bin.
 */
export function useExitTransit() {
  const qc = useQueryClient();
  return useIdempotentMutation<TransitExitResult, Error, TransitExitInput>({
    mutationKey: ["inventory", "transit", "exit"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<TransitExitResult>("/inventory/stock/transit/exit", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryTransit.strandedList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfersList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(variables.transferId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockTransactionsList });
    },
  });
}
