"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PackageStatus, ShipmentStatus, LoadStatus } from "@/features/inventory/lib";

interface PackageLine {
  id: number;
  variantId: number;
  variantName: string;
  lotId?: number | null;
  serialId?: number | null;
  qty: number;
}

export interface Package {
  id: number;
  orgId: string;
  status: PackageStatus;
  shipmentId?: number | null;
  lines?: PackageLine[];
  createdAt: string;
  updatedAt: string;
}

type PackageListResponse = {
  items: Package[];
  total: number;
  page: number;
  totalPages: number;
};

interface ShipmentLine {
  id: number;
  variantId: number;
  variantName: string;
  qty: number;
}

export interface Shipment {
  id: number;
  orgId: string;
  status: ShipmentStatus;
  soId?: number | null;
  warehouseId?: number | null;
  carrierId?: number | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  lines?: ShipmentLine[];
  packages?: Package[];
  createdAt: string;
  updatedAt: string;
}

type ShipmentListResponse = {
  items: Shipment[];
  total: number;
  page: number;
  totalPages: number;
};

interface LoadMember {
  id: number;
  type: "SHIPMENT" | "TRANSFER";
  referenceId: number;
  status?: string | null;
}

export interface Load {
  id: number;
  orgId: string;
  name?: string | null;
  status: LoadStatus;
  members?: LoadMember[];
  createdAt: string;
  updatedAt: string;
}

type LoadListResponse = {
  items: Load[];
  total: number;
  page: number;
  totalPages: number;
};

export interface Carrier {
  id: number;
  orgId: string;
  name: string;
  code: string;
  trackingUrlTemplate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PackageQueryParams {
  [key: string]: unknown;
  shipmentId?: number;
  status?: PackageStatus;
  page?: number;
  limit?: number;
}

export function usePackages(params?: PackageQueryParams) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<PackageListResponse, Error>({
    queryKey: queryKeys.inventory.packages(params),
    queryFn: () =>
      apiClient.get<PackageListResponse>("/inventory/packages", {
        ...(params?.shipmentId ? { shipmentId: String(params.shipmentId) } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function usePackageDetail(packageId: number) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<Package, Error>({
    queryKey: queryKeys.inventory.packageDetail(packageId),
    queryFn: () => apiClient.get<Package>(`/inventory/packages/${packageId}`),
    enabled: canView && packageId > 0,
    staleTime: 60_000,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation<
    Package,
    Error,
    { shipmentId?: number; lines?: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >({
    mutationKey: ["inventory", "package", "create"],
    mutationFn: (data) => apiClient.post<Package>("/inventory/packages", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
    },
  });
}

export function useUpdatePackageLines() {
  const qc = useQueryClient();
  return useMutation<
    Package,
    Error,
    { packageId: number; lines: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >({
    mutationKey: ["inventory", "package", "lines", "update"],
    mutationFn: ({ packageId, lines }) =>
      apiClient.patch<Package>(`/inventory/packages/${packageId}/lines`, { lines }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(vars.packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
    },
  });
}

export function useClosePackage() {
  const qc = useQueryClient();
  return useMutation<Package, Error, number>({
    mutationKey: ["inventory", "package", "close"],
    mutationFn: (packageId) =>
      apiClient.post<Package>(`/inventory/packages/${packageId}/close`, {}),
    onSuccess: (_, packageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
    },
  });
}

export function useReopenPackage() {
  const qc = useQueryClient();
  return useMutation<Package, Error, number>({
    mutationKey: ["inventory", "package", "reopen"],
    mutationFn: (packageId) =>
      apiClient.post<Package>(`/inventory/packages/${packageId}/reopen`, {}),
    onSuccess: (_, packageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
    },
  });
}

interface ShipmentQueryParams {
  [key: string]: unknown;
  status?: ShipmentStatus;
  carrierId?: number;
  warehouseId?: number;
  soId?: number;
  page?: number;
  limit?: number;
}

export function useShipments(params?: ShipmentQueryParams) {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<ShipmentListResponse, Error>({
    queryKey: queryKeys.inventory.shipments(params),
    queryFn: () =>
      apiClient.get<ShipmentListResponse>("/inventory/shipments", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.carrierId ? { carrierId: String(params.carrierId) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.soId ? { soId: String(params.soId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useShipment(shipmentId: number) {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<Shipment, Error>({
    queryKey: queryKeys.inventory.shipment(shipmentId),
    queryFn: () => apiClient.get<Shipment>(`/inventory/shipments/${shipmentId}`),
    enabled: canView && shipmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation<
    Shipment,
    Error,
    { soId?: number; warehouseId?: number; carrierId?: number; trackingNumber?: string; notes?: string }
  >({
    mutationKey: ["inventory", "shipment", "create"],
    mutationFn: (data) => apiClient.post<Shipment>("/inventory/shipments", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useUpdateShipment() {
  const qc = useQueryClient();
  return useMutation<
    Shipment,
    Error,
    { shipmentId: number; carrierId?: number; trackingNumber?: string; notes?: string }
  >({
    mutationKey: ["inventory", "shipment", "update"],
    mutationFn: ({ shipmentId, ...data }) =>
      apiClient.patch<Shipment>(`/inventory/shipments/${shipmentId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(vars.shipmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
    },
  });
}

export function useShipShipment() {
  const qc = useQueryClient();
  return useMutation<Shipment, Error, number>({
    mutationKey: ["inventory", "shipment", "ship"],
    mutationFn: (shipmentId) =>
      apiClient.post<Shipment>(`/inventory/shipments/${shipmentId}/ship`, {}),
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(shipmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCancelShipment() {
  const qc = useQueryClient();
  return useMutation<Shipment, Error, number>({
    mutationKey: ["inventory", "shipment", "cancel"],
    mutationFn: (shipmentId) =>
      apiClient.post<Shipment>(`/inventory/shipments/${shipmentId}/cancel`, {}),
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(shipmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
    },
  });
}

interface LoadsQueryParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
}

export function useLoads(params?: LoadsQueryParams) {
  const canView = useCan("inventory:loads:manage");
  return useQuery<LoadListResponse, Error>({
    queryKey: queryKeys.inventory.loads(params),
    queryFn: () =>
      apiClient.get<LoadListResponse>("/inventory/loads", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useLoad(loadId: number) {
  const canView = useCan("inventory:loads:manage");
  return useQuery<Load, Error>({
    queryKey: queryKeys.inventory.load(loadId),
    queryFn: () => apiClient.get<Load>(`/inventory/loads/${loadId}`),
    enabled: canView && loadId > 0,
    staleTime: 60_000,
  });
}

export function useCreateLoad() {
  const qc = useQueryClient();
  return useMutation<
    Load,
    Error,
    { name?: string; members: { type: "SHIPMENT" | "TRANSFER"; referenceId: number }[] }
  >({
    mutationKey: ["inventory", "load", "create"],
    mutationFn: (data) => apiClient.post<Load>("/inventory/loads", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useDispatchLoad() {
  const qc = useQueryClient();
  return useMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "dispatch"],
    mutationFn: (loadId) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/dispatch`, {}),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCloseLoad() {
  const qc = useQueryClient();
  return useMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "close"],
    mutationFn: (loadId) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/close`, {}),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCancelLoad() {
  const qc = useQueryClient();
  return useMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "cancel"],
    mutationFn: (loadId) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/cancel`, {}),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCarriers() {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<Carrier[], Error>({
    queryKey: queryKeys.inventory.carriers(),
    queryFn: () => apiClient.get<Carrier[]>("/inventory/carriers"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreateCarrier() {
  const qc = useQueryClient();
  return useMutation<
    Carrier,
    Error,
    { name: string; code: string; trackingUrlTemplate?: string; isActive?: boolean }
  >({
    mutationKey: ["inventory", "carrier", "create"],
    mutationFn: (data) => apiClient.post<Carrier>("/inventory/carriers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.carriers() });
    },
  });
}

export function useUpdateCarrier() {
  const qc = useQueryClient();
  return useMutation<
    Carrier,
    Error,
    { carrierId: number; name?: string; code?: string; trackingUrlTemplate?: string; isActive?: boolean }
  >({
    mutationKey: ["inventory", "carrier", "update"],
    mutationFn: ({ carrierId, ...data }) =>
      apiClient.patch<Carrier>(`/inventory/carriers/${carrierId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.carriers() });
    },
  });
}
