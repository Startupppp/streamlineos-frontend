"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type PickWaveStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PickWaveAssignment = "ANY" | "MINE" | "UNCLAIMED";
export type PickExceptionReason = "SHORT" | "NOT_FOUND" | "DAMAGED" | "SUBSTITUTED";

export interface PickWaveSummary {
  id: number;
  pickNumber: string;
  status: PickWaveStatus;
  warehouseId: number | null;
  warehouseName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  claimedAt: string | null;
  createdAt: string;
  orderCount: number;
  lineCount: number;
  linesClosed: number;
}

export interface PickWaveListResponse {
  items: PickWaveSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PickWaveFilters {
  page?: number;
  limit?: number;
  status?: PickWaveStatus;
  warehouseId?: number;
  assignment?: PickWaveAssignment;
}

/**
 * One task on the walk.
 *
 * Snake-cased because the backend returns the projection row as it reads it —
 * the wave detail is a raw SQL result rather than a mapped DTO, and renaming it
 * on the way through would be a second contract to keep in step.
 */
export interface PickWaveLine {
  id: number;
  so_line_id: number | null;
  so_number: string | null;
  product_variant_id: number;
  sku: string;
  variant_name: string;
  location_id: number | null;
  location_code: string | null;
  lot_id: number | null;
  lot_number: string | null;
  serial_id: number | null;
  serial_number: string | null;
  quantity_to_pick: string;
  quantity_picked: string;
  exception_reason: PickExceptionReason | null;
}

export interface PickWaveDetail {
  id: number;
  pickNumber: string;
  status: PickWaveStatus;
  soId: number | null;
  warehouseId: number | null;
  assignedTo: string | null;
  claimedAt: string | null;
  createdAt: string;
  lines: PickWaveLine[];
}

export interface CreatePickWaveInput {
  warehouseId: number;
  soIds: number[];
}

export interface CreatePickWaveResult {
  pickListId: number;
  pickNumber: string;
  orderCount: number;
  lineCount: number;
  unallocatedLines: number;
}

export interface ConfirmPickInput {
  pickListId: number;
  pickLineId: number;
  /** Decimal string at scale 4 — this moves a reservation into the picked bucket. */
  quantityPicked: string;
  locationId?: number;
  scannedPayload?: string;
}

export interface ConfirmPickResult {
  pickLineId: number;
  quantityPicked: string;
  waveComplete: boolean;
  pickedBy: string;
}

export interface ReportPickExceptionInput {
  pickListId: number;
  pickLineId: number;
  reason: PickExceptionReason;
  notes?: string;
  substituteVariantId?: number;
  quantityPicked?: string;
}

type QueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const WAVE_READ_KEY = "inventory:sales-orders:read";
const WAVE_WRITE_KEY = "inventory:sales-orders:ship";

export function usePickWaves(
  filters?: PickWaveFilters,
  options?: QueryOptions<PickWaveListResponse>,
) {
  const canView = useCan(WAVE_READ_KEY);
  const params = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 25,
    assignment: filters?.assignment ?? "ANY",
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
  };

  return useQuery<PickWaveListResponse, Error>({
    queryKey: queryKeys.picking.waves(params),
    queryFn: () =>
      apiClient.get<PickWaveListResponse>("/inventory/picking/waves", {
        page: String(params.page),
        limit: String(params.limit),
        assignment: params.assignment,
        ...(params.status ? { status: params.status } : {}),
        ...(params.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }),
    // A queue whose whole value is being current. A picker looking at a wave
    // somebody else claimed thirty seconds ago is the failure this screen exists
    // to prevent.
    staleTime: 15_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePickWave(
  pickListId: number,
  options?: QueryOptions<PickWaveDetail>,
) {
  const canView = useCan(WAVE_READ_KEY);
  return useQuery<PickWaveDetail, Error>({
    queryKey: queryKeys.picking.wave(pickListId),
    queryFn: () =>
      apiClient.get<PickWaveDetail>(`/inventory/picking/waves/${pickListId}`),
    staleTime: 15_000,
    ...options,
    enabled: canView && pickListId > 0 && (options?.enabled ?? true),
  });
}

export function useCreatePickWave() {
  const qc = useQueryClient();
  return useMutation<CreatePickWaveResult, Error, CreatePickWaveInput>({
    mutationKey: ["inventory", "picking", "createWave"],
    mutationFn: (data) =>
      apiClient.post<CreatePickWaveResult>("/inventory/picking/waves", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useClaimPickWave() {
  const qc = useQueryClient();
  return useMutation<{ pickListId: number; assignedTo: string; claimed: boolean }, Error, number>({
    mutationKey: ["inventory", "picking", "claim"],
    mutationFn: (pickListId) =>
      apiClient.post(`/inventory/picking/waves/${pickListId}/claim`, {}),
    onSuccess: (_, pickListId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(pickListId) });
    },
  });
}

export function useAbandonPickWave() {
  const qc = useQueryClient();
  return useMutation<{ pickListId: number; assignedTo: null; released: boolean }, Error, number>({
    mutationKey: ["inventory", "picking", "abandon"],
    mutationFn: (pickListId) =>
      apiClient.post(`/inventory/picking/waves/${pickListId}/abandon`, {}),
    onSuccess: (_, pickListId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(pickListId) });
    },
  });
}

export function useReassignPickWave() {
  const qc = useQueryClient();
  return useMutation<
    { pickListId: number; assignedTo: string },
    Error,
    { pickListId: number; assigneeUserId: string }
  >({
    mutationKey: ["inventory", "picking", "reassign"],
    mutationFn: ({ pickListId, assigneeUserId }) =>
      apiClient.post(`/inventory/picking/waves/${pickListId}/reassign`, { assigneeUserId }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
    },
  });
}

/**
 * Confirming a pick moves a reservation into the picked bucket and can move the
 * sales order with it, so stock levels, reservations and the sales-order lists
 * are all stale afterwards — not just the wave.
 *
 * The `Idempotency-Key` is generated per attempt rather than per line: a retry
 * of *this* click must replay, and the picker's next partial pick of the same
 * line must not.
 */
export function useConfirmPick() {
  const qc = useQueryClient();
  return useMutation<ConfirmPickResult, Error, ConfirmPickInput>({
    mutationKey: ["inventory", "picking", "confirm"],
    mutationFn: ({ pickListId, pickLineId, quantityPicked, locationId, scannedPayload }) =>
      apiClient.post<ConfirmPickResult>(
        `/inventory/picking/waves/${pickListId}/confirm`,
        {
          pickLineId,
          quantityPicked,
          ...(locationId !== undefined ? { locationId } : {}),
          ...(scannedPayload !== undefined ? { scannedPayload } : {}),
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useReportPickException() {
  const qc = useQueryClient();
  return useMutation<{ waveComplete: boolean }, Error, ReportPickExceptionInput>({
    mutationKey: ["inventory", "picking", "exception"],
    mutationFn: ({ pickListId, pickLineId, reason, notes, substituteVariantId, quantityPicked }) =>
      apiClient.post(
        `/inventory/picking/waves/${pickListId}/exception`,
        {
          pickLineId,
          reason,
          ...(notes ? { notes } : {}),
          ...(reason === "SUBSTITUTED"
            ? { substituteVariantId, quantityPicked }
            : {}),
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export { WAVE_READ_KEY, WAVE_WRITE_KEY };
