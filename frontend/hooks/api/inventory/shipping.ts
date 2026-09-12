"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ShipmentStatus } from "@/features/inventory/lib";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type { Package } from "./shipping-packages";

/**
 * Packages, loads and carriers live in their own modules and are re-exported
 * here, so every importer is unchanged. Shipments stay: the backend's
 * response-shape drift spec reads `ShipmentStatusEvent`, and the timeline call,
 * from this file by name.
 */
export * from "./shipping-packages";
export * from "./shipping-loads";
export * from "./shipping-carriers";

/**
 * A shipment line as `GET /inventory/shipments/:id` returns it: the stored row,
 * quantity a decimal string, the variant by id alone. `productVariant` is only
 * present where a caller loads the relation; the detail route does not.
 */
interface ShipmentLine {
  id: number;
  shipmentId: number;
  productVariantId: number;
  quantity: string;
  lotId: number | null;
  serialId: number | null;
  notes: string | null;
  productVariant?: { id: number; name: string; sku: string };
}

export interface Shipment {
  id: number;
  orgId: string;
  shipmentNumber: string;
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
    queryFn: ({ signal }) =>
      apiClient.get<ShipmentListResponse>("/inventory/shipments", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.carrierId ? { carrierId: String(params.carrierId) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.soId ? { soId: String(params.soId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useShipment(shipmentId: number) {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<Shipment, Error>({
    queryKey: queryKeys.inventory.shipment(shipmentId),
    queryFn: ({ signal }) => apiClient.get<Shipment>(`/inventory/shipments/${shipmentId}`, undefined, signal),
    enabled: canView && shipmentId > 0,
    staleTime: 60_000,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<
    Shipment,
    Error,
    { soId?: number; warehouseId?: number; carrierId?: number; trackingNumber?: string; notes?: string }
  >("inventory:shipments:manage", {
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
  return useAuthorizedMutation<
    Shipment,
    Error,
    { shipmentId: number; carrierId?: number; trackingNumber?: string; notes?: string }
  >("inventory:shipments:manage", {
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
  return useAuthorizedIdempotentMutation<Shipment, Error, number>("inventory:shipments:manage", {
    mutationKey: ["inventory", "shipment", "ship"],
    mutationFn: (shipmentId, idempotencyKey) =>
      apiClient.post<Shipment>(`/inventory/shipments/${shipmentId}/ship`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
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
    queryFn: ({ signal }) =>
      apiClient.get<ShipmentTimeline>(`/inventory/shipments/${shipmentId}/timeline`, undefined, signal),
    enabled: canView && shipmentId > 0,
    staleTime: 30_000,
  });
}

export function useRecordCarrierStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
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
  >("inventory:shipments:manage", {
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
  return useAuthorizedMutation<CarrierRefreshResult, Error, number>("inventory:shipments:manage", {
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
  return useAuthorizedIdempotentMutation<Shipment, Error, number>("inventory:shipments:manage", {
    mutationKey: ["inventory", "shipment", "cancel"],
    mutationFn: (shipmentId, idempotencyKey) =>
      apiClient.post<Shipment>(`/inventory/shipments/${shipmentId}/cancel`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipment(shipmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.shipments() });
    },
  });
}
