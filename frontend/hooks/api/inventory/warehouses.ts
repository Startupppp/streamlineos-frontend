"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WarehouseStockResult } from "@/types/inventory";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

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
  /** `numeric(18,4)`, so a decimal string — never a float. */
  capacity: string | null;
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
  _count?: { locations: number };
}

export interface WarehouseListFilters {
  q?: string;
  status?: "all" | "active" | "inactive";
  isDefault?: boolean;
  country?: string;
  city?: string;
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


interface CreateLocationInput {
  warehouseId: number;
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId?: number;
  isPickable?: boolean;
  isReceivable?: boolean;
  isSellable?: boolean;
  /**
   * A decimal string, because the endpoint validates it as one. Sent as a
   * number it was rejected by the `.strict()` schema, so a location created
   * with a capacity 400d while one created without it worked.
   */
  capacity?: string;
}

/**
 * `updateLocationSchema` is `createLocationSchema.partial()`, so every field is
 * optional and `isActive` joins them. `parentLocationId` is a positive integer
 * with no null: a parent can be changed, never cleared.
 */
interface UpdateLocationInput {
  warehouseId: number;
  locationId: number;
  name?: string;
  code?: string;
  locationType?: LocationType;
  parentLocationId?: number;
  isPickable?: boolean;
  isReceivable?: boolean;
  isSellable?: boolean;
  capacity?: string;
  isActive?: boolean;
}

export function useWarehouses(filters?: WarehouseListFilters) {
  const canView = useCan("inventory:warehouses:read");
  const params: Record<string, unknown> = {};
  if (filters?.q) params.q = filters.q;
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.isDefault !== undefined) params.isDefault = filters.isDefault;
  if (filters?.country) params.country = filters.country;
  if (filters?.city) params.city = filters.city;

  const hasActiveFilters = Object.keys(params).length > 0;

  return useQuery<Warehouse[], Error>({
    queryKey: hasActiveFilters
      ? [...queryKeys.inventory.warehouses(), params]
      : queryKeys.inventory.warehouses(),
    queryFn: () => apiClient.get<Warehouse[]>("/inventory/warehouses", hasActiveFilters ? params : undefined),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useWarehouse(warehouseId: number) {
  const canView = useCan("inventory:warehouses:read");
  return useQuery<Warehouse, Error>({
    queryKey: queryKeys.inventory.warehouse(warehouseId),
    queryFn: () => apiClient.get<Warehouse>(`/inventory/warehouses/${warehouseId}`),
    enabled: canView && warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useLocations(warehouseId: number) {
  const canView = useCan("inventory:warehouses:read");
  return useQuery<WarehouseLocation[], Error>({
    queryKey: queryKeys.inventory.locations(warehouseId),
    queryFn: () =>
      apiClient.get<WarehouseLocation[]>(`/inventory/warehouses/${warehouseId}/locations`),
    enabled: canView && warehouseId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useIdempotentMutation<Warehouse, Error, CreateWarehouseInput>({
    mutationKey: ["inventory", "warehouses", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Warehouse>("/inventory/warehouses", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useIdempotentMutation<WarehouseLocation, Error, CreateLocationInput>({
    mutationKey: ["inventory", "locations", "create"],
    mutationFn: ({ warehouseId, ...data }, idempotencyKey) =>
      apiClient.post<WarehouseLocation>(`/inventory/warehouses/${warehouseId}/locations`, data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventory.locations(vars.warehouseId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(vars.warehouseId) });
    },
  });
}

/**
 * Correcting a location, and taking one out of service.
 *
 * Deactivating one the warehouse still holds stock in is refused by the server
 * with a 409 — a location nothing can reach is not the same as an empty one —
 * and that message reaches the operator through `getErrorMessage`.
 */
export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation<WarehouseLocation, Error, UpdateLocationInput>({
    mutationKey: ["inventory", "locations", "update"],
    mutationFn: ({ warehouseId, locationId, ...data }) =>
      apiClient.patch<WarehouseLocation>(
        `/inventory/warehouses/${warehouseId}/locations/${locationId}`,
        data,
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.locations(vars.warehouseId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(vars.warehouseId) });
    },
  });
}

export function useSetDefaultWarehouse() {
  const qc = useQueryClient();
  return useMutation<
    Warehouse,
    Error,
    { warehouseId: number },
    { previous: Warehouse[] | undefined }
  >({
    mutationKey: ["inventory", "warehouse", "set-default"],
    mutationFn: ({ warehouseId }) =>
      apiClient.patch<Warehouse>(`/inventory/warehouses/${warehouseId}`, { isDefault: true }),
    onMutate: async ({ warehouseId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.inventory.warehouses() });
      const previous = qc.getQueryData<Warehouse[]>(queryKeys.inventory.warehouses());
      qc.setQueryData<Warehouse[]>(
        queryKeys.inventory.warehouses(),
        (old) => old?.map((wh) => ({ ...wh, isDefault: wh.id === warehouseId })) ?? [],
      );
      return { previous };
    },
    onError: (_, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.inventory.warehouses(), context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
    },
  });
}

export function useWarehouseStock(
  warehouseId: number,
  filters?: { page?: number; limit?: number },
) {
  const canView = useCan("inventory:stock:read");
  return useQuery<WarehouseStockResult, Error>({
    queryKey: [...queryKeys.inventory.warehouse(warehouseId), "stock", filters] as const,
    queryFn: () =>
      apiClient.get<WarehouseStockResult>(`/inventory/warehouses/${warehouseId}/stock`, {
        page: filters?.page,
        limit: filters?.limit,
      }),
    enabled: canView && warehouseId > 0,
    staleTime: 60_000,
  });
}

export interface WarehouseAssignee {
  userId: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  grantedBy: string;
  grantedByName: string | null;
  grantedAt: string;
}

export interface AssignableWarehouseUser {
  userId: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

/** The exact backend key on every warehouse-assignment handler. */
export const WAREHOUSE_ASSIGNMENT_PERMISSION = "inventory:warehouses:manage" as const;

export interface WarehouseAssigneePage {
  items: WarehouseAssignee[];
  total: number;
  page: number;
  totalPages: number;
}

function warehouseAssigneesKey(warehouseId: number, page: number, limit: number) {
  return [...queryKeys.inventory.warehouse(warehouseId), "users", { page, limit }] as const;
}

function assignableWarehouseUsersKey(warehouseId: number, search: string) {
  return [...queryKeys.inventory.warehouse(warehouseId), "assignable-users", search] as const;
}

export function useWarehouseAssignees(
  warehouseId: number,
  filters: { page: number; limit: number },
  options?: { enabled?: boolean },
) {
  const canManage = useCan(WAREHOUSE_ASSIGNMENT_PERMISSION);
  return useQuery<WarehouseAssigneePage, Error>({
    queryKey: warehouseAssigneesKey(warehouseId, filters.page, filters.limit),
    queryFn: () =>
      apiClient.get<WarehouseAssigneePage>(`/inventory/warehouses/${warehouseId}/users`, {
        page: filters.page,
        limit: filters.limit,
      }),
    enabled: canManage && warehouseId > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAssignableWarehouseUsers(
  warehouseId: number,
  search: string,
  options?: { enabled?: boolean },
) {
  const canManage = useCan(WAREHOUSE_ASSIGNMENT_PERMISSION);
  return useQuery<AssignableWarehouseUser[], Error>({
    queryKey: assignableWarehouseUsersKey(warehouseId, search),
    queryFn: () =>
      apiClient.get<AssignableWarehouseUser[]>(
        `/inventory/warehouses/${warehouseId}/assignable-users`,
        search ? { q: search } : undefined,
      ),
    enabled: canManage && warehouseId > 0 && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * A grant widens what the grantee may see, so every warehouse-scoped list has to
 * be refetched, not just this warehouse's assignment table.
 */
function useWarehouseAssignmentInvalidation(warehouseId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouse(warehouseId) });
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.warehouses() });
  };
}

export function useGrantWarehouseUser(warehouseId: number) {
  const invalidate = useWarehouseAssignmentInvalidation(warehouseId);
  return useMutation<{ granted: boolean }, Error, { userId: string }>({
    mutationKey: ["inventory", "warehouses", "grant-user", warehouseId],
    mutationFn: (data) =>
      apiClient.post<{ granted: boolean }>(`/inventory/warehouses/${warehouseId}/users`, data),
    onSuccess: invalidate,
  });
}

export function useRevokeWarehouseUser(warehouseId: number) {
  const invalidate = useWarehouseAssignmentInvalidation(warehouseId);
  return useMutation<{ revoked: true }, Error, { userId: string }>({
    mutationKey: ["inventory", "warehouses", "revoke-user", warehouseId],
    mutationFn: ({ userId }) =>
      apiClient.delete<{ revoked: true }>(
        `/inventory/warehouses/${warehouseId}/users/${encodeURIComponent(userId)}`,
      ),
    onSuccess: invalidate,
  });
}
