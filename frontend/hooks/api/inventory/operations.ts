"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface GrnLine {
  id: number;
  poLineId: number;
  quantityReceived: string;
  qualityStatus: "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  serialNumbers: string[] | null;
}

export interface GrnSummary {
  id: number;
  grnNumber: string;
  poId: number;
  poNumber: string | null;
  vendorId: number;
  vendorName: string | null;
  receivedDate: string;
  locationId: number | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface GrnDetail extends GrnSummary {
  lines: GrnLine[];
}

type GrnFilters = {
  poId?: number;
  vendorId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export function useGoodsReceipts(filters?: GrnFilters) {
  return useQuery<PaginatedResponse<GrnSummary>, Error>({
    queryKey: queryKeys.inventory.goodsReceipts(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<GrnSummary>>("/inventory/goods-receipts", {
        ...(filters?.poId !== undefined ? { poId: String(filters.poId) } : {}),
        ...(filters?.vendorId !== undefined ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.dateFrom !== undefined ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useGoodsReceipt(grnId: number) {
  return useQuery<GrnDetail, Error>({
    queryKey: queryKeys.inventory.goodsReceipt(grnId),
    queryFn: () => apiClient.get<GrnDetail>(`/inventory/goods-receipts/${grnId}`),
    enabled: grnId > 0,
    staleTime: 2 * 60_000,
  });
}

interface ReverseGrnInput {
  grnId: number;
  reason: string;
}

export function useReverseGrn() {
  const qc = useQueryClient();
  return useMutation<void, Error, ReverseGrnInput>({
    mutationKey: ["inventory", "goodsReceipts", "reverse"],
    mutationFn: ({ grnId, reason }) =>
      apiClient.post<void>(
        `/inventory/goods-receipts/${grnId}/reverse`,
        { reason },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceipts() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceipt(variables.grnId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export type VendorReturnReason = "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "EXPIRED" | "QUALITY_REJECTED";
export type VendorReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

export interface VendorReturnLine {
  productVariantId: number;
  locationId: number;
  quantity: number;
  reason: VendorReturnReason;
  lotId?: number;
  serialId?: number;
  unitCost?: string;
}

export interface VendorReturnSummary {
  id: number;
  returnNumber: string;
  vendorId: number;
  vendorName: string | null;
  poId: number | null;
  status: VendorReturnStatus;
  createdAt: string;
  notes: string | null;
}

export interface CreateVendorReturnInput {
  vendorId: number;
  poId?: number;
  grnId?: number;
  notes?: string;
  lines: VendorReturnLine[];
}

type VendorReturnFilters = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export function useVendorReturns(filters?: VendorReturnFilters) {
  return useQuery<PaginatedResponse<VendorReturnSummary>, Error>({
    queryKey: queryKeys.inventory.vendorReturns(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<VendorReturnSummary>>("/inventory/vendor-returns", {
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useVendorReturn(returnId: number) {
  return useQuery<VendorReturnSummary, Error>({
    queryKey: queryKeys.inventory.vendorReturn(returnId),
    queryFn: () => apiClient.get<VendorReturnSummary>(`/inventory/vendor-returns/${returnId}`),
    enabled: returnId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendorReturn() {
  const qc = useQueryClient();
  return useMutation<VendorReturnSummary, Error, CreateVendorReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<VendorReturnSummary>("/inventory/vendor-returns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
    },
  });
}

interface PostVendorReturnInput {
  returnId: number;
  reason?: string;
}

export function usePostVendorReturn() {
  const qc = useQueryClient();
  return useMutation<void, Error, PostVendorReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<void>(
        `/inventory/vendor-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(variables.returnId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

interface CancelVendorReturnInput {
  returnId: number;
}

export function useCancelVendorReturn() {
  const qc = useQueryClient();
  return useMutation<void, Error, CancelVendorReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<void>(`/inventory/vendor-returns/${returnId}/cancel`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(variables.returnId) });
    },
  });
}

export type CustomerReturnDisposition = "RESTOCK" | "QUARANTINE" | "SCRAP";
export type CustomerReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

export interface CustomerReturnLine {
  productVariantId: number;
  quantity: number;
  reason: string;
  disposition: CustomerReturnDisposition;
  targetLocationId?: number;
  lotId?: number;
  serialId?: number;
}

export interface CustomerReturnSummary {
  id: number;
  returnNumber: string;
  soId: number | null;
  clientId: number | null;
  customerName: string | null;
  status: CustomerReturnStatus;
  createdAt: string;
  notes: string | null;
}

export interface CreateCustomerReturnInput {
  soId?: number;
  shipmentId?: number;
  clientId?: number;
  notes?: string;
  lines: CustomerReturnLine[];
}

type CustomerReturnFilters = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export function useCustomerReturns(filters?: CustomerReturnFilters) {
  return useQuery<PaginatedResponse<CustomerReturnSummary>, Error>({
    queryKey: queryKeys.inventory.customerReturns(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<CustomerReturnSummary>>("/inventory/customer-returns", {
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useCustomerReturn(returnId: number) {
  return useQuery<CustomerReturnSummary, Error>({
    queryKey: queryKeys.inventory.customerReturn(returnId),
    queryFn: () =>
      apiClient.get<CustomerReturnSummary>(`/inventory/customer-returns/${returnId}`),
    enabled: returnId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<CustomerReturnSummary, Error, CreateCustomerReturnInput>({
    mutationKey: ["inventory", "customerReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<CustomerReturnSummary>("/inventory/customer-returns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
    },
  });
}

interface PostCustomerReturnInput {
  returnId: number;
  reason?: string;
}

export function usePostCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<void, Error, PostCustomerReturnInput>({
    mutationKey: ["inventory", "customerReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<void>(
        `/inventory/customer-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturn(variables.returnId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

interface CancelCustomerReturnInput {
  returnId: number;
}

export function useCancelCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<void, Error, CancelCustomerReturnInput>({
    mutationKey: ["inventory", "customerReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<void>(`/inventory/customer-returns/${returnId}/cancel`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturn(variables.returnId) });
    },
  });
}
