"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface PurchaseOrderFilters {
  vendorId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface PoLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface CreatePurchaseOrderInput {
  vendorId: number;
  warehouseId: number;
  expectedDate?: string;
  lines: PoLine[];
  notes?: string;
  currency?: string;
}

interface SendPurchaseOrderInput {
  poId: number;
}

interface ReceiveGoodsInput {
  poId: number;
  receivedLines: Array<{
    productId: number;
    receivedQty: number;
    locationId?: number;
  }>;
  notes?: string;
}

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.purchaseOrders(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/purchase-orders", {
        ...(filters?.vendorId ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function usePurchaseOrder(poId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.purchaseOrder(poId),
    queryFn: () =>
      apiClient.get<unknown>(`/inventory/purchase-orders/${poId}`),
    enabled: poId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreatePurchaseOrderInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/purchase-orders", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export function useSendPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, SendPurchaseOrderInput>({
    mutationFn: ({ poId }) =>
      apiClient.post<unknown>(`/inventory/purchase-orders/${poId}/send`, {}),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(vars.poId) });
    },
  });
}

export function useReceiveGoods() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, ReceiveGoodsInput>({
    mutationFn: ({ poId, ...data }) =>
      apiClient.post<unknown>(`/inventory/purchase-orders/${poId}/receive`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(vars.poId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}
