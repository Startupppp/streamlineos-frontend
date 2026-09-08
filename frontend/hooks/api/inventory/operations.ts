"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface GrnLine {
  id: number;
  grnId: number;
  poLineId: number;
  quantityReceived: string;
  uomId: number | null;
  quantityEntered: string | null;
  status: string;
  rejectionReason: string | null;
}

export interface GrnSummary {
  id: number;
  orgId: string;
  grnNumber: string;
  poId: number;
  receivedDate: string;
  locationId: number | null;
  status: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  po?: { id: number; poNumber: string };
}

interface GrnDetail extends GrnSummary {
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

const listGrnsOperationsContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.listGrnsOperationsContract),
);
const getGrnOperationsContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.getGrnOperationsContract),
);
const listVendorReturnsContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.listVendorReturnsContract),
);
const getVendorReturnContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.getVendorReturnContract),
);
const listCustomerReturnsContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.listCustomerReturnsContract),
);
const getCustomerReturnContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.getCustomerReturnContract),
);
const reverseGrnResponseContract = lazyContract(() =>
  import("@/hooks/api/inventory/operations-schema").then((m) => m.reverseGrnResponseContract),
);

export function useGoodsReceipts(filters?: GrnFilters) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<PaginatedResponse<GrnSummary>, Error>({
    queryKey: queryKeys.inventory.goodsReceipts(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<GrnSummary>>("/inventory/goods-receipts", {
        ...(filters?.poId !== undefined ? { poId: String(filters.poId) } : {}),
        ...(filters?.vendorId !== undefined ? { vendorId: String(filters.vendorId) } : {}),
        ...(filters?.dateFrom !== undefined ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }, signal, listGrnsOperationsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGoodsReceipt(grnId: number) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<GrnDetail, Error>({
    queryKey: queryKeys.inventory.goodsReceipt(grnId),
    queryFn: ({ signal }) => apiClient.get<GrnDetail>(`/inventory/goods-receipts/${grnId}`, undefined, signal, getGrnOperationsContract),
    staleTime: 2 * 60_000,
    enabled: canView && grnId > 0,
  });
}

interface ReverseGrnInput {
  grnId: number;
  reason: string;
}

export function useReverseGrn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ reversed: true; grnId: number; transactionCount: number }, Error, ReverseGrnInput>("inventory:purchase-orders:receive", {
    mutationKey: ["inventory", "goodsReceipts", "reverse"],
    mutationFn: ({ grnId, reason }) =>
      apiClient.post<{ reversed: true; grnId: number; transactionCount: number }>(
        `/inventory/goods-receipts/${grnId}/reverse`,
        { reason },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        reverseGrnResponseContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceipts() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceipt(variables.grnId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

type VendorReturnReason = "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "EXPIRED" | "QUALITY_REJECTED";
export type VendorReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

interface VendorReturnLine {
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
  poId: number | null;
  status: VendorReturnStatus;
  createdAt: string;
  notes: string | null;
}

interface CreateVendorReturnInput {
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
  const canView = useCan("inventory:vendor-returns:manage");
  return useQuery<PaginatedResponse<VendorReturnSummary>, Error>({
    queryKey: queryKeys.inventory.vendorReturns(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<VendorReturnSummary>>("/inventory/vendor-returns", {
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }, signal, listVendorReturnsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCreateVendorReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<VendorReturnSummary, Error, CreateVendorReturnInput>("inventory:vendor-returns:manage", {
    mutationKey: ["inventory", "vendorReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<VendorReturnSummary>("/inventory/vendor-returns", data, undefined, getVendorReturnContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
    },
  });
}

interface PostVendorReturnInput {
  returnId: number;
  reason?: string;
}

export function usePostVendorReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<VendorReturnSummary, Error, PostVendorReturnInput>("inventory:vendor-returns:manage", {
    mutationKey: ["inventory", "vendorReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        getVendorReturnContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(variables.returnId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

interface CancelVendorReturnInput {
  returnId: number;
}

export function useCancelVendorReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<VendorReturnSummary, Error, CancelVendorReturnInput>("inventory:vendor-returns:manage", {
    mutationKey: ["inventory", "vendorReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<VendorReturnSummary>(`/inventory/vendor-returns/${returnId}/cancel`, {}, undefined, getVendorReturnContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturns() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(variables.returnId) });
    },
  });
}

type CustomerReturnDisposition = "RESTOCK" | "QUARANTINE" | "SCRAP";
export type CustomerReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

interface CustomerReturnLine {
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
  status: CustomerReturnStatus;
  createdAt: string;
  notes: string | null;
}

interface CreateCustomerReturnInput {
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
  const canView = useCan("inventory:customer-returns:manage");
  return useQuery<PaginatedResponse<CustomerReturnSummary>, Error>({
    queryKey: queryKeys.inventory.customerReturns(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<CustomerReturnSummary>>("/inventory/customer-returns", {
        ...(filters?.status !== undefined ? { status: filters.status } : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize !== undefined ? { pageSize: String(filters.pageSize) } : {}),
      }, signal, listCustomerReturnsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCreateCustomerReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CustomerReturnSummary, Error, CreateCustomerReturnInput>("inventory:customer-returns:manage", {
    mutationKey: ["inventory", "customerReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<CustomerReturnSummary>("/inventory/customer-returns", data, undefined, getCustomerReturnContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
    },
  });
}

interface PostCustomerReturnInput {
  returnId: number;
  reason?: string;
}

export function usePostCustomerReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CustomerReturnSummary, Error, PostCustomerReturnInput>("inventory:customer-returns:manage", {
    mutationKey: ["inventory", "customerReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<CustomerReturnSummary>(
        `/inventory/customer-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        getCustomerReturnContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturn(variables.returnId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

interface CancelCustomerReturnInput {
  returnId: number;
}

export function useCancelCustomerReturn() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CustomerReturnSummary, Error, CancelCustomerReturnInput>("inventory:customer-returns:manage", {
    mutationKey: ["inventory", "customerReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<CustomerReturnSummary>(`/inventory/customer-returns/${returnId}/cancel`, {}, undefined, getCustomerReturnContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturns() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturn(variables.returnId) });
    },
  });
}
