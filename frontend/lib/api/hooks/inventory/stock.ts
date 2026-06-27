"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface StockFilters {
  warehouseId?: number;
  productId?: number;
  page?: number;
  limit?: number;
}

interface TransactionFilters {
  warehouseId?: number;
  productId?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface MovementFilters {
  warehouseId?: number;
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface CreateAdjustmentInput {
  warehouseId: number;
  locationId?: number;
  productId: number;
  adjustmentType: "IN" | "OUT" | "SET";
  quantity: number;
  reason: string;
  notes?: string;
}

interface CreateTransferInput {
  fromWarehouseId: number;
  toWarehouseId: number;
  fromLocationId?: number;
  toLocationId?: number;
  lines: Array<{
    productId: number;
    quantity: number;
  }>;
  notes?: string;
  expectedDate?: string;
}

interface CompleteTransferInput {
  transferId: number;
  receivedLines: Array<{
    productId: number;
    receivedQty: number;
  }>;
  notes?: string;
}

export function useAdjustments() {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.adjustments(),
    queryFn: () => apiClient.get<unknown>("/inventory/stock/adjustments"),
    staleTime: 2 * 60_000,
  });
}

export function useStockLevels(filters?: StockFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.stockLevels(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/stock", {
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
        ...(filters?.productId ? { productId: String(filters.productId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useStockTransactions(filters?: TransactionFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.stockTransactions(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/stock/transactions", {
        ...(filters?.warehouseId ? { warehouseId: String(filters.warehouseId) } : {}),
        ...(filters?.productId ? { productId: String(filters.productId) } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useTransfers() {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.transfers(),
    queryFn: () => apiClient.get<unknown>("/inventory/stock/transfers"),
    staleTime: 2 * 60_000,
  });
}

export function useTransfer(transferId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.transfer(transferId),
    queryFn: () =>
      apiClient.get<unknown>(`/inventory/stock/transfers/${transferId}`),
    enabled: transferId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateAdjustmentInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/stock/adjustments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateTransferInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/stock/transfers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCompleteTransfer() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CompleteTransferInput>({
    mutationFn: ({ transferId, ...data }) =>
      apiClient.post<unknown>(
        `/inventory/stock/transfers/${transferId}/complete`,
        data
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(vars.transferId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}
