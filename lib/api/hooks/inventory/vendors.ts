"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface VendorFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface CreateVendorInput {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gstin?: string;
  paymentTerms?: number;
  currency?: string;
  notes?: string;
  isActive?: boolean;
}

interface UpdateVendorInput extends Partial<CreateVendorInput> {
  vendorId: number;
}

export function useVendors(filters?: VendorFilters) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.vendors(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<unknown>("/inventory/vendors", {
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.isActive !== undefined ? { isActive: String(filters.isActive) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useVendor(vendorId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.vendor(vendorId),
    queryFn: () => apiClient.get<unknown>(`/inventory/vendors/${vendorId}`),
    enabled: vendorId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateVendorInput>({
    mutationFn: (data) => apiClient.post<unknown>("/inventory/vendors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, UpdateVendorInput>({
    mutationFn: ({ vendorId, ...data }) =>
      apiClient.patch<unknown>(`/inventory/vendors/${vendorId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendors() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.vendor(vars.vendorId) });
    },
  });
}
