"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  GrnDiscrepancyReason,
  GrnQuality,
  GrnStatus,
} from "@/features/inventory/lib/inventory-status";

export interface GrnLine {
  id: number;
  poLineId: number;
  quantityReceived: string;
  quantityEntered: string | null;
  uomId: number | null;
  uomFactor: string | null;
  quantityExpected: string | null;
  discrepancyReason: GrnDiscrepancyReason | null;
  qualityStatus: GrnQuality;
  rejectionReason: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  serials: Array<{ id: number; serialNumber: string }>;
}

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

type GrnFilters = {
  poId?: number;
  vendorId?: number;
  status?: GrnStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

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
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<GrnSummary>>("/inventory/goods-receipts", {
        ...(filters?.poId !== undefined ? { poId: String(filters.poId) } : {}),
        ...(filters?.vendorId !== undefined ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.dateFrom !== undefined ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
      }, signal),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGoodsReceipt(grnId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<GrnDetail, Error>({
    queryKey: queryKeys.inventory.goodsReceipt(grnId),
    queryFn: ({ signal }) => apiClient.get<GrnDetail>(`/inventory/goods-receipts/${grnId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && grnId > 0,
  });
}

export interface GrnDraftLineInput {
  poLineId: number;
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
  return useAuthorizedIdempotentMutation<GrnDetail, Error, CreateGrnDraftInput>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "createDraft"],
    mutationFn: (body, idempotencyKey) =>
      apiClient.post<GrnDetail>("/inventory/goods-receipts", body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function useUpdateGrnDraft() {
  const invalidate = useReceiptInvalidation();
  return useAuthorizedMutation<GrnDetail, Error, UpdateGrnDraftInput>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "updateDraft"],
    mutationFn: ({ grnId, ...body }) =>
      apiClient.patch<GrnDetail>(`/inventory/goods-receipts/${grnId}`, body),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function useStartGrnCount() {
  const invalidate = useReceiptInvalidation();
  return useAuthorizedIdempotentMutation<GrnDetail, Error, { grnId: number }>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "count"],
    mutationFn: ({ grnId }, idempotencyKey) =>
      apiClient.post<GrnDetail>(`/inventory/goods-receipts/${grnId}/count`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function useSubmitGrnForQuality() {
  const invalidate = useReceiptInvalidation();
  return useAuthorizedIdempotentMutation<GrnDetail, Error, { grnId: number }>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "qualityReview"],
    mutationFn: ({ grnId }, idempotencyKey) =>
      apiClient.post<GrnDetail>(`/inventory/goods-receipts/${grnId}/quality-review`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (data) => invalidate(data.id, false),
  });
}

export function usePostGrn() {
  const invalidate = useReceiptInvalidation();
  return useAuthorizedIdempotentMutation<GrnDetail, Error, { grnId: number }>("inventory:purchase-orders:receive", {
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
  return useAuthorizedIdempotentMutation<GrnDetail, Error, { grnId: number; reason?: string }>("inventory:purchase-orders:receive", {
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
  return useAuthorizedIdempotentMutation<void, Error, ReverseGrnInput>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "reverse"],
    mutationFn: ({ grnId, reason }, idempotencyKey) =>
      apiClient.post<void>(
        `/inventory/goods-receipts/${grnId}/reverse`,
        { reason }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => invalidate(variables.grnId, true),
  });
}
