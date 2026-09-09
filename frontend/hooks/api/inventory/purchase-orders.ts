"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  PurchaseOrder,
  PurchaseOrderSummary,
  PurchaseOrderStatus,
  CreatePurchaseOrderInput,
  ReceiveGoodsInput,
  GoodsReceiptNote,
} from "@/types/inventory";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

type PurchaseOrderFilters = {
  vendorId?: number;
  status?: PurchaseOrderStatus;
  page?: number;
  pageSize?: number;
};

interface CreatePoLineWire {
  productVariantId: number;
  quantity: number;
  unitCost: string;
  taxRate: string;
  lineOrder: number;
}

interface CreatePoWire {
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  warehouseId?: number;
  currency?: string;
  notes?: string;
  lines: CreatePoLineWire[];
}

interface SendPurchaseOrderInput {
  poId?: number;
}

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", {
        ...(filters?.vendorId ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize ? { limit: String(filters.pageSize) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useVendorPurchaseOrders(vendorId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders({ vendorId }),
    queryFn: () =>
      apiClient.get<PaginatedResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", {
        vendorId: String(vendorId),
      }),
    staleTime: 2 * 60_000,
    enabled: canView && vendorId > 0,
  });
}

export function usePurchaseOrder(poId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PurchaseOrder, Error>({
    queryKey: queryKeys.inventory.purchaseOrder(poId),
    queryFn: () => apiClient.get<PurchaseOrder>(`/inventory/purchase-orders/${poId}`),
    staleTime: 2 * 60_000,
    enabled: canView && poId > 0,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useIdempotentMutation<PurchaseOrderSummary, Error, CreatePurchaseOrderInput>({
    mutationKey: ["inventory", "purchase-orders", "create"],
    mutationFn: (data, idempotencyKey) => {
      const body: CreatePoWire = {
        vendorId: data.vendorId,
        orderDate: data.orderDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        warehouseId: data.warehouseId,
        currency: data.currency,
        notes: data.notes,
        lines: data.lines.map((line) => ({
          productVariantId: line.productVariantId,
          quantity: line.quantity,
          unitCost: line.unitCost.toFixed(4),
          taxRate: (line.taxRate ?? 0).toFixed(2),
          lineOrder: line.lineOrder ?? 0,
        })),
      };
      return apiClient.post<PurchaseOrderSummary>("/inventory/purchase-orders", body, { headers: { "Idempotency-Key": idempotencyKey } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export function useSendPurchaseOrder(poId?: number) {
  const qc = useQueryClient();
  return useIdempotentMutation<PurchaseOrderSummary, Error, SendPurchaseOrderInput | undefined>({
    mutationKey: ["inventory", "purchase-orders", "send", poId],
    mutationFn: (vars, idempotencyKey) => {
      const id = poId ?? vars?.poId;
      if (!id) throw new Error("Purchase order id is required");
      return apiClient.post<PurchaseOrderSummary>(`/inventory/purchase-orders/${id}/send`, {}, { headers: { "Idempotency-Key": idempotencyKey } });
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(result.id) });
    },
  });
}

/**
 * Record and post a delivery in one call.
 *
 * The header is not optional: the endpoint takes `@IdempotencyKey()`, which
 * throws without it, so every receipt raised from this sheet was answered with
 * "An Idempotency-Key header is required for this operation". It sent none.
 */
export function useReceiveGoods(poId: number) {
  const qc = useQueryClient();
  return useIdempotentMutation<GoodsReceiptNote, Error, ReceiveGoodsInput>({
    mutationKey: ["inventory", "purchase-orders", "receive", poId],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<GoodsReceiptNote>(`/inventory/purchase-orders/${poId}/receive`, data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({
        queryKey: queryKeys.inventory.goodsReceiptsList,
      });
    },
  });
}

interface CancelPurchaseOrderInput {
  reason?: string;
}

export function useApprovePurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useIdempotentMutation<PurchaseOrderSummary, Error, void>({
    mutationKey: ["inventory", "purchase-orders", "approve", poId],
    mutationFn: (_variables, idempotencyKey) =>
      apiClient.post<PurchaseOrderSummary>(
        `/inventory/purchase-orders/${poId}/approve`,
        {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useClosePurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useIdempotentMutation<void, Error, void>({
    mutationKey: ["inventory", "purchase-orders", "close", poId],
    mutationFn: (_variables, idempotencyKey) =>
      apiClient.post<void>(
        `/inventory/purchase-orders/${poId}/close`,
        {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useCancelPurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useIdempotentMutation<void, Error, CancelPurchaseOrderInput | undefined>({
    mutationKey: ["inventory", "purchase-orders", "cancel", poId],
    mutationFn: (vars, idempotencyKey) =>
      apiClient.post<void>(
        `/inventory/purchase-orders/${poId}/cancel`,
        vars ?? {}, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

interface UpdatePoLineInput {
  productVariantId: number;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  lineOrder?: number;
}

export interface UpdatePurchaseOrderInput {
  poId: number;
  vendorId?: number;
  orderDate?: string;
  expectedDeliveryDate?: string;
  warehouseId?: number;
  currency?: string;
  notes?: string;
  lines?: UpdatePoLineInput[];
}

export function useUpdatePurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useMutation<PurchaseOrderSummary, Error, UpdatePurchaseOrderInput>({
    mutationKey: ["inventory", "purchase-orders", "update", poId],
    mutationFn: ({ lines, ...rest }) =>
      apiClient.patch<PurchaseOrderSummary>(`/inventory/purchase-orders/${poId}`, {
        ...rest,
        ...(lines !== undefined
          ? {
              lines: lines.map((l, idx) => ({
                productVariantId: l.productVariantId,
                quantity: l.quantity,
                unitCost: l.unitCost.toFixed(4),
                taxRate: (l.taxRate ?? 0).toFixed(2),
                lineOrder: l.lineOrder ?? idx,
              })),
            }
          : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

