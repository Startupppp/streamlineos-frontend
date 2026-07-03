"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryVendor, CreateVendorInput, UpdateVendorInput } from "@/types/inventory";

type VendorFilters = {
  q?: string;
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
  const search = filters?.q ?? filters?.search;
  const limit = filters?.pageSize ?? filters?.limit;
  return useQuery<VendorListResponse, Error>({
    queryKey: queryKeys.inventory.vendors(filters),
    queryFn: () =>
      apiClient.get<VendorListResponse>("/inventory/vendors", {
        ...(search ? { search } : {}),
        ...(filters?.isActive !== undefined ? { isActive: String(filters.isActive) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(limit ? { limit: String(limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useVendor(vendorId: number) {
  return useQuery<InventoryVendor, Error>({
    queryKey: queryKeys.inventory.vendor(vendorId),
    queryFn: () => apiClient.get<InventoryVendor>(`/inventory/vendors/${vendorId}`),
    enabled: vendorId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation<InventoryVendor, Error, CreateVendorInput>({
    mutationKey: ["inventory", "vendors", "create"],
    mutationFn: (data) => apiClient.post<InventoryVendor>("/inventory/vendors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
    },
  });
}

export function useUpdateVendor(vendorId?: number) {
  const qc = useQueryClient();
  return useMutation<InventoryVendor, Error, UpdateVendorPayload>({
    mutationKey: ["inventory", "vendors", "update", vendorId],
    mutationFn: ({ id, ...data }) => {
      const targetId = vendorId ?? id;
      return apiClient.patch<InventoryVendor>(`/inventory/vendors/${targetId}`, data);
    },
    onSuccess: (_, variables) => {
      const targetId = vendorId ?? variables.id;
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      if (targetId) qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(targetId) });
    },
  });
}
