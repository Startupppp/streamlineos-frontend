"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface CreateWarehouseInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive?: boolean;
}

interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  warehouseId: number;
}

interface CreateLocationInput {
  warehouseId: number;
  name: string;
  code: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  bin?: string;
}

export function useWarehouses() {
  return useQuery<unknown[], Error>({
    queryKey: queryKeys.inventory.warehouses(),
    queryFn: () => apiClient.get<unknown[]>("/inventory/warehouses"),
    staleTime: 5 * 60_000,
  });
}

export function useWarehouse(warehouseId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.warehouse(warehouseId),
    queryFn: () => apiClient.get<unknown>(`/inventory/warehouses/${warehouseId}`),
    enabled: warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useLocations(warehouseId: number) {
  return useQuery<unknown[], Error>({
    queryKey: queryKeys.inventory.locations(warehouseId),
    queryFn: () =>
      apiClient.get<unknown[]>(`/inventory/warehouses/${warehouseId}/locations`),
    enabled: warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateWarehouseInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/warehouses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, UpdateWarehouseInput>({
    mutationFn: ({ warehouseId, ...data }) =>
      apiClient.patch<unknown>(`/inventory/warehouses/${warehouseId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(vars.warehouseId) });
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateLocationInput>({
    mutationFn: ({ warehouseId, ...data }) =>
      apiClient.post<unknown>(`/inventory/warehouses/${warehouseId}/locations`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventory.locations(vars.warehouseId),
      });
    },
  });
}
