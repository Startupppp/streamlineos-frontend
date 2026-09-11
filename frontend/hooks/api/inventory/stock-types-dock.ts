"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

/**
 * NEO-9, NEO-11 and NEO-12 - kits, consignment and the dock.
 *
 * Three small features in one hook file because each is a handful of calls and a
 * file per feature would be three imports for one screen. Quantities are decimal
 * strings throughout, as everywhere else in this module.
 */
export interface KitComponent {
  id: number;
  componentVariantId: number;
  quantityPer: string;
  lineOrder: number;
}

export interface KitAssemblyResult {
  kitVariantId: number;
  locationId: number;
  quantity: string;
  totalCost: string;
  transactionIds: number[];
}

export interface ConsignedRow {
  product_variant_id: number;
  location_id: number;
  ownership: "VENDOR" | "CUSTOMER";
  on_hand: string;
}

export type DockDirection = "INBOUND" | "OUTBOUND";
export type DockAppointmentStatus = "BOOKED" | "ARRIVED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface DockDoor {
  id: number;
  warehouseId: number;
  code: string;
  name: string | null;
  direction: DockDirection | null;
  isActive: boolean;
}

export interface DockAppointment {
  id: number;
  warehouseId: number;
  doorId: number;
  doorCode: string;
  direction: DockDirection;
  status: DockAppointmentStatus;
  windowStart: string;
  windowEnd: string;
  carrierName: string | null;
  vehicleRef: string | null;
  reference: string | null;
  asnId: number | null;
  loadId: number | null;
}

export function useKitBom(kitVariantId: number | null) {
  const canView = useCan("inventory:products:read");
  return useQuery<KitComponent[], Error>({
    queryKey: queryKeys.inventory.kitBom(kitVariantId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<KitComponent[]>(`/inventory/kits/${kitVariantId}/bom`, undefined, signal),
    enabled: canView && (kitVariantId ?? 0) > 0,
    staleTime: 60_000,
  });
}

export function useKitBuildable(kitVariantId: number | null, warehouseId?: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<{ kitVariantId: number; warehouseId: number | null; buildable: string }, Error>({
    queryKey: queryKeys.inventory.kitBuildable(kitVariantId ?? 0, warehouseId ?? null),
    queryFn: ({ signal }) =>
      apiClient.get("/inventory/kits/buildable", {
        kitVariantId: String(kitVariantId ?? 0),
        ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
      }, signal),
    enabled: canView && (kitVariantId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useSetKitBom() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    KitComponent[],
    Error,
    { kitVariantId: number; components: Array<{ componentVariantId: number; quantityPer: string }> }
  >("inventory:products:update", {
    mutationKey: ["inventory", "kits", "set-bom"],
    mutationFn: ({ kitVariantId, components }) =>
      apiClient.put<KitComponent[]>(`/inventory/kits/${kitVariantId}/bom`, { components }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.kitBom(vars.kitVariantId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.kitsAll });
    },
  });
}

export function useAssembleKit() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    KitAssemblyResult,
    Error,
    { kitVariantId: number; locationId: number; quantity: string; disassemble?: boolean }
  >({
    mutationKey: ["inventory", "kits", "assemble"],
    mutationFn: ({ disassemble, ...data }, idempotencyKey) =>
      apiClient.post<KitAssemblyResult>(
        `/inventory/kits/${disassemble ? "disassemble" : "assemble"}`,
        data, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      // Assembling consumes components and creates the kit, so every stock and
      // valuation figure on screen is stale.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.kitsAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
    },
  });
}

export function useConsignedStock(warehouseId?: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ConsignedRow[], Error>({
    queryKey: queryKeys.inventory.consignedStock(warehouseId ?? null),
    queryFn: ({ signal }) =>
      apiClient.get<ConsignedRow[]>("/inventory/ownership/consigned", {
        ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
      }, signal),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useConvertOwnership() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    unknown,
    Error,
    {
      productVariantId: number;
      locationId: number;
      quantity: string;
      fromOwnership: "OWNED" | "VENDOR" | "CUSTOMER";
      toOwnership: "OWNED" | "VENDOR" | "CUSTOMER";
      unitCost: string;
    }
  >({
    mutationKey: ["inventory", "ownership", "convert"],
    mutationFn: (data, idempotencyKey) => apiClient.post("/inventory/ownership/convert", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.consignedStockAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
    },
  });
}

export function useDockDoors(warehouseId?: number) {
  const canView = useCan("inventory:warehouses:read");
  return useQuery<DockDoor[], Error>({
    queryKey: queryKeys.inventory.dockDoors(warehouseId ?? null),
    queryFn: ({ signal }) =>
      apiClient.get<DockDoor[]>("/inventory/dock/doors", {
        ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
      }, signal),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function useDockAppointments(range: { from: string; to: string; warehouseId?: number }) {
  const canView = useCan("inventory:dock:manage");
  return useQuery<DockAppointment[], Error>({
    queryKey: queryKeys.inventory.dockAppointments(range),
    queryFn: ({ signal }) =>
      apiClient.get<DockAppointment[]>("/inventory/dock/appointments", {
        from: range.from,
        to: range.to,
        ...(range.warehouseId ? { warehouseId: String(range.warehouseId) } : {}),
      }, signal),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    DockAppointment,
    Error,
    {
      doorId: number;
      direction: DockDirection;
      windowStart: string;
      windowEnd: string;
      carrierName?: string;
      vehicleRef?: string;
      reference?: string;
      asnId?: number;
    }
  >({
    mutationKey: ["inventory", "dock", "book"],
    mutationFn: (data, idempotencyKey) => apiClient.post<DockAppointment>("/inventory/dock/appointments", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.dockAppointmentsAll });
    },
  });
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    DockAppointment,
    Error,
    { appointmentId: number; status: "ARRIVED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" }
  >("inventory:dock:manage", {
    mutationKey: ["inventory", "dock", "status"],
    mutationFn: ({ appointmentId, status }) =>
      apiClient.patch<DockAppointment>(`/inventory/dock/appointments/${appointmentId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.dockAppointmentsAll });
    },
  });
}
