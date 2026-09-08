"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PackageStatus, ShipmentStatus, LoadStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/use-idempotent-mutation";

/**
 * B6. These are the column names the API actually returns and accepts.
 *
 * They were declared as `variantId`/`qty`, which the backend's strict Zod
 * schemas reject outright on the way in and never emit on the way out — so
 * every package line rendered blank and every line save came back 400. A
 * contract that does not match is not a smaller contract, it is a broken one.
 */
export interface PackageLine {
  id: number;
  productVariantId: number;
  lotId?: number | null;
  serialId?: number | null;
  quantity: string;
}

export interface PackageWriteLine {
  productVariantId: number;
  lotId?: number;
  serialId?: number;
  quantity: string;
}

export interface Package {
  id: number;
  orgId: string;
  status: PackageStatus;
  packageNumber: string;
  shipmentId?: number | null;
  soId?: number | null;
  cartonTypeId?: number | null;
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
  soId?: number;
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
        ...(params?.soId ? { soId: String(params.soId) } : {}),
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
  return useIdempotentMutation<
    Package,
    Error,
    { shipmentId?: number; soId?: number; cartonTypeId?: number; lines?: PackageWriteLine[] }
  >({
    mutationKey: ["inventory", "package", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Package>("/inventory/packages", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}

export function useUpdatePackageLines() {
  const qc = useQueryClient();
  return useMutation<Package, Error, { packageId: number; lines: PackageWriteLine[] }>({
    mutationKey: ["inventory", "package", "lines", "update"],
    mutationFn: ({ packageId, lines }) =>
      apiClient.patch<Package>(`/inventory/packages/${packageId}/lines`, { lines }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(vars.packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(vars.packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}

export function useClosePackage() {
  const qc = useQueryClient();
  return useMutation<Package, Error, { packageId: number; cartonTypeId?: number }>({
    mutationKey: ["inventory", "package", "close"],
    mutationFn: ({ packageId, ...body }) =>
      apiClient.post<Package>(`/inventory/packages/${packageId}/close`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(vars.packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(vars.packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
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
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
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
  return useIdempotentMutation<
    Shipment,
    Error,
    { soId?: number; warehouseId?: number; carrierId?: number; trackingNumber?: string; notes?: string }
  >({
    mutationKey: ["inventory", "shipment", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Shipment>("/inventory/shipments", data, { headers: { "Idempotency-Key": idempotencyKey } }),
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

/**
 * B7 — the carrier contract, as the API actually exposes it.
 *
 * A shipment's journey is a list of events the carrier claimed, newest first.
 * Each is stored under the carrier's own event id, so a replayed scan is a
 * no-op, and an event that would move the shipment backwards is recorded and
 * ignored rather than applied — `advanced: false` is the API saying so.
 */
export interface ShipmentStatusEvent {
  id: number;
  status: ShipmentStatus;
  /** When the carrier says it happened, which is not when we heard. */
  occurredAt: string;
  receivedAt: string;
  description?: string | null;
}

export interface ShipmentTimeline {
  shipment: { id: number; status: ShipmentStatus; trackingNumber: string | null };
  events: ShipmentStatusEvent[];
}

export interface CarrierStatusRecorded {
  recorded: boolean;
  advanced: boolean;
  status: ShipmentStatus;
}

/**
 * What a refresh did. `polled: false` is the normal answer while no real carrier
 * adapter is registered: there is nobody to ask, and tracking on this shipment
 * is whatever the operator entered.
 */
export interface CarrierRefreshResult {
  shipmentId: number;
  carrier: string;
  polled: boolean;
  recorded: number;
  status: ShipmentStatus;
  deadLettered: boolean;
  error?: string;
}

export function useShipmentTimeline(shipmentId: number) {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<ShipmentTimeline, Error>({
    queryKey: queryKeys.inventory.shipmentTimeline(shipmentId),
    queryFn: () =>
      apiClient.get<ShipmentTimeline>(`/inventory/shipments/${shipmentId}/timeline`),
    enabled: canView && shipmentId > 0,
    staleTime: 30_000,
  });
}

export function useRecordCarrierStatus() {
  const qc = useQueryClient();
  return useMutation<
    CarrierStatusRecorded,
    Error,
    {
      shipmentId: number;
      trackingNumber: string;
      status: "LABEL_CREATED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
      occurredAt: string;
      carrierEventId?: string;
      description?: string;
    }
  >({
    mutationKey: ["inventory", "shipment", "carrier-status"],
    mutationFn: ({ shipmentId: _shipmentId, ...body }) =>
      apiClient.post<CarrierStatusRecorded>("/inventory/shipments/carrier-status", body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventory.shipmentTimeline(vars.shipmentId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(vars.shipmentId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
    },
  });
}

export function useRefreshShipmentTracking() {
  const qc = useQueryClient();
  return useMutation<CarrierRefreshResult, Error, number>({
    mutationKey: ["inventory", "shipment", "refresh-tracking"],
    mutationFn: (shipmentId) =>
      apiClient.post<CarrierRefreshResult>(
        `/inventory/shipments/${shipmentId}/refresh-tracking`,
        {},
      ),
    onSuccess: (_data, shipmentId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.shipmentTimeline(shipmentId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(shipmentId) });
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
  return useIdempotentMutation<
    Load,
    Error,
    { name?: string; members: { type: "SHIPMENT" | "TRANSFER"; referenceId: number }[] }
  >({
    mutationKey: ["inventory", "load", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Load>("/inventory/loads", data, { headers: { "Idempotency-Key": idempotencyKey } }),
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
  return useIdempotentMutation<
    Carrier,
    Error,
    { name: string; code: string; trackingUrlTemplate?: string; isActive?: boolean }
  >({
    mutationKey: ["inventory", "carrier", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Carrier>("/inventory/carriers", data, { headers: { "Idempotency-Key": idempotencyKey } }),
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
