"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { WarehouseStockResult } from "@/types/inventory";

export type LocationType =
  | "ZONE"
  | "AISLE"
  | "RACK"
  | "BIN"
  | "RECEIVING"
  | "SHIPPING"
  | "QUARANTINE"
  | "SCRAP"
  | "TRANSIT"
  | "RETURNS";

export interface WarehouseLocation {
  id: number;
  orgId: string;
  warehouseId: number;
  parentLocationId: number | null;
  name: string;
  code: string;
  locationType: LocationType;
  isPickable: boolean;
  isReceivable: boolean;
  isSellable: boolean;
  capacity: number | null;
  isActive: boolean;
  isSpecial?: boolean;
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
  branchId: number | null;
  managerUserId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  locations?: WarehouseLocation[];
}

interface CreateWarehouseInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  warehouseId: number;
}

interface CreateLocationInput {
  warehouseId: number;
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId?: number;
  isPickable?: boolean;
  isReceivable?: boolean;
  isSellable?: boolean;
  capacity?: number;
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
    mutationKey: ["inventory", "warehouses", "create"],
    mutationFn: (data) => apiClient.post<Warehouse>("/inventory/warehouses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation<Warehouse, Error, UpdateWarehouseInput>({
    mutationKey: ["inventory", "warehouses", "update"],
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
    mutationKey: ["inventory", "locations", "create"],
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

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    {
      warehouseId: number;
      locationId: number;
      data: {
        name?: string;
        code?: string;
        locationType?: LocationType;
        isPickable?: boolean;
        isReceivable?: boolean;
        isSellable?: boolean;
        capacity?: number | null;
        isActive?: boolean;
      };
    }
  >({
    mutationKey: ["inventory", "location", "update"],
    mutationFn: ({ warehouseId, locationId, data }) =>
      apiClient.patch(`/inventory/warehouses/${warehouseId}/locations/${locationId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.locations(vars.warehouseId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useSetDefaultWarehouse() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { warehouseId: number },
    { previous: Warehouse[] | undefined }
  >({
    mutationKey: ["inventory", "warehouse", "set-default"],
    mutationFn: ({ warehouseId }) =>
      apiClient.patch(`/inventory/warehouses/${warehouseId}`, { isDefault: true }),
    onMutate: async ({ warehouseId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.inventory.warehouses() });
      const previous = qc.getQueryData<Warehouse[]>(queryKeys.inventory.warehouses());
      qc.setQueryData<Warehouse[]>(
        queryKeys.inventory.warehouses(),
        (old) => old?.map((wh) => ({ ...wh, isDefault: wh.id === warehouseId })) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.inventory.warehouses(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useWarehouseStock(
  warehouseId: number,
  filters?: { page?: number; limit?: number },
) {
  return useQuery<WarehouseStockResult, Error>({
    queryKey: [...queryKeys.inventory.warehouse(warehouseId), "stock", filters],
    queryFn: () =>
      apiClient.get<WarehouseStockResult>(`/inventory/warehouses/${warehouseId}/stock`, {
        page: filters?.page,
        limit: filters?.limit,
      }),
    enabled: warehouseId > 0,
    staleTime: 60_000,
  });
}
