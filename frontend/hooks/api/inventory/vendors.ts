"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { InventoryVendor, CreateVendorInput, UpdateVendorInput, VendorPerformance } from "@/types/inventory";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

const listVendorsContract = lazyContract(() =>
  import("@/hooks/api/inventory/vendors-schema").then((m) => m.listVendorsContract),
);
const invVendorContract = lazyContract(() =>
  import("@/hooks/api/inventory/vendors-schema").then((m) => m.invVendorContract),
);
const vendorPerformanceContract = lazyContract(() =>
  import("@/hooks/api/inventory/vendors-schema").then((m) => m.vendorPerformanceContract),
);

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
      }, signal, listVendorsContract),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useVendor(vendorId: number) {
  const canView = useCan("inventory:vendors:read");
  return useQuery<InventoryVendor, Error>({
    queryKey: queryKeys.inventory.vendor(vendorId),
    queryFn: ({ signal }) => apiClient.get<InventoryVendor>(`/inventory/vendors/${vendorId}`, undefined, signal, invVendorContract),
    staleTime: 2 * 60_000,
    enabled: canView && vendorId > 0,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InventoryVendor, Error, CreateVendorInput>("inventory:vendors:manage", {
    mutationKey: ["inventory", "vendors", "create"],
    mutationFn: (data) => apiClient.post<InventoryVendor>("/inventory/vendors", data, undefined, invVendorContract),
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
      return apiClient.patch<InventoryVendor>(`/inventory/vendors/${targetId}`, data, undefined, invVendorContract);
    },
    onSuccess: (_, variables) => {
      const targetId = vendorId ?? variables.id;
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      if (targetId) void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(targetId) });
    },
  });
}

export function useVendorPerformance(vendorId: number) {
  const canView = useCan("inventory:vendors:read");
  return useQuery<VendorPerformance, Error>({
    queryKey: [...queryKeys.inventory.vendor(vendorId), "performance"],
    queryFn: ({ signal }) => apiClient.get<VendorPerformance>(`/inventory/vendors/${vendorId}/performance`, undefined, signal, vendorPerformanceContract),
    staleTime: 5 * 60_000,
    enabled: canView && vendorId > 0,
  });
}

export function useToggleVendorActive(vendorId?: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<InventoryVendor, Error, { id: number; isActive: boolean }>("inventory:vendors:manage", {
    mutationKey: ["inventory", "vendors", "toggle-active", vendorId],
    mutationFn: ({ id, isActive }) =>
      apiClient.patch<InventoryVendor>(`/inventory/vendors/${id}`, { isActive }, undefined, invVendorContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(variables.id) });
    },
  });
}
