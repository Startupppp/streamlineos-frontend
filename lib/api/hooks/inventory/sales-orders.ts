"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface SalesOrderFilters {
  customerId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface SoLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

interface CreateSalesOrderInput {
  customerId?: number;
  warehouseId: number;
  expectedShipDate?: string;
  lines: SoLine[];
  notes?: string;
  currency?: string;
  shippingAddress?: string;
}

interface SoActionInput {
  soId: number;
}

interface ShipSalesOrderInput {
  soId: number;
  shippedLines: Array<{
    productId: number;
    shippedQty: number;
    locationId?: number;
  }>;
  trackingNumber?: string;
  notes?: string;
}

interface InvoiceSalesOrderInput {
  soId: number;
  notes?: string;
}

export function useSalesOrders(filters?: SalesOrderFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.salesOrders(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/sales-orders", {
        ...(filters?.customerId ? { customerId: String(filters.customerId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useSalesOrder(soId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.salesOrder(soId),
    queryFn: () =>
      apiClient.get<unknown>(`/inventory/sales-orders/${soId}`),
    enabled: soId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useSoAtp(soId: number) {
  return useQuery<unknown, Error>({
    queryKey: [...queryKeys.inventory.salesOrder(soId), "atp"] as const,
    queryFn: () =>
      apiClient.get<unknown>(`/inventory/sales-orders/${soId}/atp`),
    enabled: soId > 0,
    staleTime: 1 * 60_000,
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateSalesOrderInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/sales-orders", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, SoActionInput>({
    mutationFn: ({ soId }) =>
      apiClient.post<unknown>(`/inventory/sales-orders/${soId}/confirm`, {}),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(vars.soId) });
    },
  });
}

export function useShipSalesOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, ShipSalesOrderInput>({
    mutationFn: ({ soId, ...data }) =>
      apiClient.post<unknown>(`/inventory/sales-orders/${soId}/ship`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(vars.soId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useInvoiceSalesOrder() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, InvoiceSalesOrderInput>({
    mutationFn: ({ soId, ...data }) =>
      apiClient.post<unknown>(`/inventory/sales-orders/${soId}/invoice`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(vars.soId) });
    },
  });
}
