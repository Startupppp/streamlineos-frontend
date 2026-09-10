"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  GrnDiscrepancyReason,
  GrnQuality,
  GrnStatus,
} from "@/features/inventory/lib/inventory-status";

export interface GrnLine {
  id: number;
  poLineId: number;
  /** Base UOM, which is the only unit the stock ledger holds. */
  quantityReceived: string;
  /** What the counter typed, in `uomId`, and the factor that was applied. */
  quantityEntered: string | null;
  uomId: number | null;
  uomFactor: string | null;
  /** What the purchase-order line still owed when the receipt posted. */
  quantityExpected: string | null;
  discrepancyReason: GrnDiscrepancyReason | null;
  qualityStatus: GrnQuality;
  rejectionReason: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  serials: Array<{ id: number; serialNumber: string }>;
}

/**
 * The vendor and the order arrive nested, because that is what the endpoint
 * returns. The flat `poNumber` / `vendorName` this used to declare existed on
 * no response the API has ever sent, so the receipts table rendered a dash in
 * both columns for every row.
 */
export interface GrnPurchaseOrderRef {
  id: number;
  poNumber: string;
  vendorId: number;
  status?: string;
  vendor: { id: number; name: string } | null;
}

export interface GrnSummary {
  id: number;
  grnNumber: string;
  poId: number;
  status: GrnStatus;
  receivedDate: string;
  locationId: number | null;
  notes: string | null;
  postedAt: string | null;
  createdBy: string;
  createdAt: string;
  purchaseOrder: GrnPurchaseOrderRef | null;
  creator: { id: string; name: string | null } | null;
}

export interface GrnDetail extends GrnSummary {
  lines: GrnLine[];
  poster: { id: string; name: string | null } | null;
}

/**
 * `limit`, not `pageSize`.
 *
 * The backend's `listGrnSchema` is `.strict()` and names the field `limit`, so
 * `pageSize` was not ignored — it was refused, and every consumer of this hook
 * rendered "Something went wrong · Unrecognized key: \"pageSize\"" instead of a
 * list. The Receipts workbench could never show a receipt, the putaway
 * workbench's "Raise a putaway" dialog could never offer a posted delivery to
 * put away, and the landed-cost sheet could never offer a receipt to cost.
 *
 * Caught by `e2e/inventory-receive.spec.ts`, which posts a receipt through the
 * UI and then looks for it on the screen that lists receipts. Nothing else
 * could have caught it: the paginated shape typechecks either way, and no unit
 * test asks the real endpoint what it accepts.
 */
type GrnFilters = {
  poId?: number;
  vendorId?: number;
  status?: GrnStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  /** Capped at 100 by the server, which refuses anything larger. */
  limit?: number;
};

/**
 * B1. `goodsReceipts()` yields `[..., "goodsReceipts", undefined]`, and
 * TanStack's partial match walks the given key's own indexes — so index 3
 * compares `undefined` against a stored filter object and never matches. Every
 * no-argument invalidation of this list has therefore been a silent no-op.
 *
 * Derived from the factory rather than hand-typed, because the fix belongs in
 * `lib/query-keys/inventory.ts` as a `goodsReceiptsList` prefix beside
 * `productsList`, and that file is owned elsewhere this cycle.
 */
const goodsReceiptsPrefix = queryKeys.inventory.goodsReceiptsList;

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export function useGoodsReceipts(filters?: GrnFilters) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<GrnSummary>, Error>({
    queryKey: queryKeys.inventory.goodsReceipts(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<GrnSummary>>("/inventory/goods-receipts", {
        ...(filters?.poId !== undefined ? { poId: String(filters.poId) } : {}),
        ...(filters?.vendorId !== undefined ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.dateFrom !== undefined ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGoodsReceipt(grnId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<GrnDetail, Error>({
    queryKey: queryKeys.inventory.goodsReceipt(grnId),
    queryFn: () => apiClient.get<GrnDetail>(`/inventory/goods-receipts/${grnId}`),
    staleTime: 2 * 60_000,
    enabled: canView && grnId > 0,
  });
}

export interface GrnDraftLineInput {
  poLineId: number;
  /** In `uomId` when one is given, otherwise the product's base unit. */
  quantityReceived: string;
  uomId?: number;
  discrepancyReason?: GrnDiscrepancyReason;
  qualityStatus: GrnQuality;
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  serialNumbers?: string[];
}

export interface CreateGrnDraftInput {
  poId: number;
  receivedDate: string;
  locationId?: number;
  notes?: string;
  lines: GrnDraftLineInput[];
}

export interface UpdateGrnDraftInput {
  grnId: number;
  receivedDate?: string;
  locationId?: number;
  notes?: string;
  lines?: GrnDraftLineInput[];
}

/**
 * Every receipt mutation moves the same two surfaces — the list and the one
 * document — and posting moves stock as well. Written once so a new lifecycle
 * action cannot forget one of them.
 */
function useReceiptInvalidation() {
  const qc = useQueryClient();
  return (grnId: number, movedStock: boolean) => {
    void qc.invalidateQueries({ queryKey: goodsReceiptsPrefix });
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceipt(grnId) });
    if (!movedStock) return;
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
  };
}

export function useCreateGrnDraft() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<GrnDetail, Error, CreateGrnDraftInput>({
    mutationKey: ["inventory", "goodsReceipts", "createDraft"],
    mutationFn: (body, idempotencyKey) =>
      apiClient.post<GrnDetail>("/inventory/goods-receipts", body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function useUpdateGrnDraft() {
  const invalidate = useReceiptInvalidation();
  return useMutation<GrnDetail, Error, UpdateGrnDraftInput>({
    mutationKey: ["inventory", "goodsReceipts", "updateDraft"],
    mutationFn: ({ grnId, ...body }) =>
      apiClient.patch<GrnDetail>(`/inventory/goods-receipts/${grnId}`, body),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

/** DRAFT -> COUNTING, and back from quality review when a count is disputed. */
export function useStartGrnCount() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<GrnDetail, Error, { grnId: number }>({
    mutationKey: ["inventory", "goodsReceipts", "count"],
    mutationFn: ({ grnId }, idempotencyKey) =>
      apiClient.post<GrnDetail>(`/inventory/goods-receipts/${grnId}/count`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function useSubmitGrnForQuality() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<GrnDetail, Error, { grnId: number }>({
    mutationKey: ["inventory", "goodsReceipts", "qualityReview"],
    mutationFn: ({ grnId }, idempotencyKey) =>
      apiClient.post<GrnDetail>(`/inventory/goods-receipts/${grnId}/quality-review`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

/** The only action here that writes to the stock ledger. */
export function usePostGrn() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<GrnDetail, Error, { grnId: number }>({
    mutationKey: ["inventory", "goodsReceipts", "post"],
    mutationFn: ({ grnId }, idempotencyKey) =>
      apiClient.post<GrnDetail>(
        `/inventory/goods-receipts/${grnId}/post`,
        {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (data) => invalidate(data.id, true),
  });
}

export function useCancelGrn() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<GrnDetail, Error, { grnId: number; reason?: string }>({
    mutationKey: ["inventory", "goodsReceipts", "cancel"],
    mutationFn: ({ grnId, reason }, idempotencyKey) =>
      apiClient.post<GrnDetail>(`/inventory/goods-receipts/${grnId}/cancel`, {
        ...(reason ? { reason } : {}),
      }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

interface ReverseGrnInput {
  grnId: number;
  reason: string;
}

export function useReverseGrn() {
  const invalidate = useReceiptInvalidation();
  return useIdempotentMutation<void, Error, ReverseGrnInput>({
    mutationKey: ["inventory", "goodsReceipts", "reverse"],
    mutationFn: ({ grnId, reason }, idempotencyKey) =>
      apiClient.post<void>(
        `/inventory/goods-receipts/${grnId}/reverse`,
        { reason }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => invalidate(variables.grnId, true),
  });
}
