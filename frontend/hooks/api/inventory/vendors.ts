"use client";

import {
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  InventoryVendor,
  CreateVendorInput,
  UpdateVendorInput,
} from "@/types/inventory";
import type {
  VendorScorecard,
  VendorDeliveriesResponse,
} from "@/types/inventory-vendor-performance";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

type VendorFilters = {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  limit?: number;
};

interface VendorListResponse {
  items: InventoryVendor[];
  total: number;
  page: number;
  totalPages: number;
}

type UpdateVendorPayload = UpdateVendorInput & { id?: number };

export function useVendors(filters?: VendorFilters) {
  const canView = useCan("inventory:vendors:read");
  const limit = filters?.pageSize ?? filters?.limit;
  return useQuery<VendorListResponse, Error>({
    queryKey: queryKeys.inventory.vendors(filters),
    queryFn: ({ signal }) =>
      apiClient.get<VendorListResponse>("/inventory/vendors", {
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.isActive !== undefined ? { isActive: String(filters.isActive) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(limit ? { limit: String(limit) } : {}),
      }, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useVendor(vendorId: number) {
  const canView = useCan("inventory:vendors:read");
  return useQuery<InventoryVendor, Error>({
    queryKey: queryKeys.inventory.vendor(vendorId),
    queryFn: ({ signal }) => apiClient.get<InventoryVendor>(`/inventory/vendors/${vendorId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && vendorId > 0,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<InventoryVendor, Error, CreateVendorInput>("inventory:vendors:manage", {
    mutationKey: ["inventory", "vendors", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<InventoryVendor>("/inventory/vendors", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
    },
  });
}

export function useUpdateVendor(vendorId?: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<InventoryVendor, Error, UpdateVendorPayload>("inventory:vendors:manage", {
    mutationKey: ["inventory", "vendors", "update", vendorId],
    mutationFn: ({ id, ...data }) => {
      const targetId = vendorId ?? id;
      return apiClient.patch<InventoryVendor>(`/inventory/vendors/${targetId}`, data);
    },
    onSuccess: (_, variables) => {
      const targetId = vendorId ?? variables.id;
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      if (targetId) {
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(targetId) });
        // The scorecard reports spend in the vendor's own currency, so editing
        // that field moves a number the card renders.
        void qc.invalidateQueries({ queryKey: queryKeys.vendorScorecard.card(targetId) });
      }
    },
  });
}

/**
 * C4. Every supplier number the page renders comes from here — the backend
 * derives them once and the component does no arithmetic of its own.
 */
export function useVendorPerformance(
  vendorId: number,
  options?: Omit<UseQueryOptions<VendorScorecard, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("inventory:vendors:read");
  return useQuery<VendorScorecard, Error>({
    ...options,
    queryKey: queryKeys.vendorScorecard.card(vendorId),
    queryFn: ({ signal }) => apiClient.get<VendorScorecard>(`/inventory/vendors/${vendorId}/performance`, undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView && vendorId > 0 && (options?.enabled ?? true),
  });
}

/** The purchase orders and receipts a rate was computed from. */
export function useVendorDeliveries(
  vendorId: number,
  params: { page: number; limit: number },
  options?: Omit<UseQueryOptions<VendorDeliveriesResponse, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("inventory:vendors:read");
  return useQuery<VendorDeliveriesResponse, Error>({
    ...options,
    queryKey: queryKeys.vendorScorecard.deliveries(vendorId, params),
    queryFn: ({ signal }) =>
      apiClient.get<VendorDeliveriesResponse>(`/inventory/vendors/${vendorId}/deliveries`, {
        page: String(params.page),
        limit: String(params.limit),
      }, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView && vendorId > 0 && (options?.enabled ?? true),
  });
}

export function useToggleVendorActive(vendorId?: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<InventoryVendor, Error, { id: number; isActive: boolean }>("inventory:vendors:manage", {
    mutationKey: ["inventory", "vendors", "toggle-active", vendorId],
    mutationFn: ({ id, isActive }) =>
      apiClient.patch<InventoryVendor>(`/inventory/vendors/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(variables.id) });
    },
  });
}
