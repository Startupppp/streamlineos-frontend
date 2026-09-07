"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  PurchaseOrderSummary,
  PurchaseOrderStatus,
  PurchaseOrderLine,
  CreatePurchaseOrderInput,
  ReceiveGoodsInput,
} from "@/types/inventory";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LocalPurchaseOrder {
  id: number;
  orgId: string;
  poNumber: string;
  vendorId: number;
  warehouseId: number | null;
  status: PurchaseOrderStatus;
  orderDate: string;
  subtotal: string;
  taxAmount: string;
  discount: string;
  total: string;
  currency: string;
  expectedDeliveryDate: string | null;
  sentAt: string | null;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  approvedAt: string | null;
  notes: string | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: number; name: string; code: string };
  warehouse?: { id: number; name: string; code: string };
  creator?: { id: string; name: string | null };
  lines: PurchaseOrderLine[];
}

interface LocalGrn {
  id: number;
  grnNumber: string;
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

const listPosContract = lazyContract(() =>
  import("@/hooks/api/inventory/purchase-orders-schema").then((m) => m.listPosContract),
);
const getPoContract = lazyContract(() =>
  import("@/hooks/api/inventory/purchase-orders-schema").then((m) => m.getPoContract),
);
const getGrnContract = lazyContract(() =>
  import("@/hooks/api/inventory/purchase-orders-schema").then((m) => m.getGrnContract),
);

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", {
        ...(filters?.vendorId ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize ? { limit: String(filters.pageSize) } : {}),
      }, signal, listPosContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useVendorPurchaseOrders(vendorId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders({ vendorId }),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", {
        vendorId: String(vendorId),
      }, signal, listPosContract),
    staleTime: 2 * 60_000,
    enabled: canView && vendorId > 0,
  });
}

export function usePurchaseOrder(poId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<LocalPurchaseOrder, Error>({
    queryKey: queryKeys.inventory.purchaseOrder(poId),
    queryFn: ({ signal }) => apiClient.get<LocalPurchaseOrder>(`/inventory/purchase-orders/${poId}`, undefined, signal, getPoContract),
    staleTime: 2 * 60_000,
    enabled: canView && poId > 0,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PurchaseOrderSummary, Error, CreatePurchaseOrderInput>("inventory:purchase-orders:create", {
    mutationKey: ["inventory", "purchase-orders", "create"],
    mutationFn: (data) => {
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
      return apiClient.post<PurchaseOrderSummary>("/inventory/purchase-orders", body, undefined, getPoContract);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export function useSendPurchaseOrder(poId?: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<PurchaseOrderSummary, Error, SendPurchaseOrderInput | undefined>("inventory:purchase-orders:approve", {
    mutationKey: ["inventory", "purchase-orders", "send", poId],
    mutationFn: (vars) => {
      const id = poId ?? vars?.poId;
      if (!id) throw new Error("Purchase order id is required");
      return apiClient.post<PurchaseOrderSummary>(`/inventory/purchase-orders/${id}/send`, {}, undefined, getPoContract);
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(result.id) });
    },
  });
}

export function useReceiveGoods(poId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<LocalGrn, Error, ReceiveGoodsInput>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "purchase-orders", "receive", poId],
    mutationFn: (data) =>
      apiClient.post<LocalGrn>(`/inventory/purchase-orders/${poId}/receive`, data, undefined, getGrnContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

interface CancelPurchaseOrderInput {
  reason?: string;
}

export function useApprovePurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<PurchaseOrderSummary, Error, void>("inventory:purchase-orders:approve", {
    mutationKey: ["inventory", "purchase-orders", "approve", poId],
    mutationFn: () =>
      apiClient.post<PurchaseOrderSummary>(
        `/inventory/purchase-orders/${poId}/approve`,
        {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        getPoContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useClosePurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, void>("inventory:purchase-orders:approve", {
    mutationKey: ["inventory", "purchase-orders", "close", poId],
    mutationFn: () =>
      apiClient.post<void>(
        `/inventory/purchase-orders/${poId}/close`,
        {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useCancelPurchaseOrder(poId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, CancelPurchaseOrderInput | undefined>("inventory:purchase-orders:approve", {
    mutationKey: ["inventory", "purchase-orders", "cancel", poId],
    mutationFn: (vars) =>
      apiClient.post<void>(
        `/inventory/purchase-orders/${poId}/cancel`,
        vars ?? {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
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
  return useAuthorizedMutation<PurchaseOrderSummary, Error, UpdatePurchaseOrderInput>("inventory:purchase-orders:update", {
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
      }, undefined, getPoContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

