"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type LocationType = "ZONE" | "AISLE" | "RACK" | "BIN";

export interface WarehouseLocation {
  id: number;
  orgId: string;
  warehouseId: number;
  parentLocationId: number | null;
  name: string;
  code: string;
  locationType: LocationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: WarehouseLocation[];
}

export interface Warehouse {
  id: number;
  orgId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  locations?: WarehouseLocation[];
}

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isDefault?: boolean;
}

export interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  warehouseId: number;
}

export interface CreateLocationInput {
  warehouseId: number;
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId?: number;
}

export function useWarehouses() {
  return useQuery<Warehouse[], Error>({
    queryKey: queryKeys.inventory.warehouses(),
    queryFn: () => apiClient.get<Warehouse[]>("/inventory/warehouses"),
    staleTime: 5 * 60_000,
  });
}

export function useWarehouse(warehouseId: number) {
  return useQuery<Warehouse, Error>({
    queryKey: queryKeys.inventory.warehouse(warehouseId),
    queryFn: () => apiClient.get<Warehouse>(`/inventory/warehouses/${warehouseId}`),
    enabled: warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useLocations(warehouseId: number) {
  return useQuery<WarehouseLocation[], Error>({
    queryKey: queryKeys.inventory.locations(warehouseId),
    queryFn: () =>
      apiClient.get<WarehouseLocation[]>(`/inventory/warehouses/${warehouseId}/locations`),
    enabled: warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation<Warehouse, Error, CreateWarehouseInput>({
    mutationFn: (data) => apiClient.post<Warehouse>("/inventory/warehouses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation<Warehouse, Error, UpdateWarehouseInput>({
    mutationFn: ({ warehouseId, ...data }) =>
      apiClient.patch<Warehouse>(`/inventory/warehouses/${warehouseId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(vars.warehouseId) });
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation<WarehouseLocation, Error, CreateLocationInput>({
    mutationFn: ({ warehouseId, ...data }) =>
      apiClient.post<WarehouseLocation>(`/inventory/warehouses/${warehouseId}/locations`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventory.locations(vars.warehouseId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(vars.warehouseId) });
    },
  });
}
