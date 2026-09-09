"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

import type {
  PickExceptionReason,
  PickExceptionResolution,
  PickExceptionStatus,
} from "@/features/inventory/lib/inventory-status";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

export type PickWaveStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PickWaveAssignment = "ANY" | "MINE" | "UNCLAIMED";
export type PickExceptionOwnership = "ANY" | "MINE";
export type { PickExceptionReason, PickExceptionResolution, PickExceptionStatus };

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
  /** B5. How many of this wave's lines are waiting on a reviewer. */
  openExceptions: number;
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
  exception_notes: string | null;
  exception_status: PickExceptionStatus | null;
  exception_resolution: PickExceptionResolution | null;
  exception_owner_id: string | null;
  exception_owner_name: string | null;
  exception_location_code: string | null;
  substitute_variant_id: number | null;
  substitute_sku: string | null;
  substitute_quantity: string | null;
  /**
   * B5. Whether the server considers this task finished with.
   *
   * Sent rather than derived here. The rule now has three clauses — picked in
   * full, a closing reason, and a reviewer's signature where one is required —
   * and a client copy of it would be a fourth place for it to drift, showing a
   * picker a finished row the wave still considers outstanding.
   */
  line_closed: boolean;
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
  /** `WRONG_LOCATION` only — where the picker actually found the goods. */
  foundLocationId?: number;
  /** `SUBSTITUTED` only. Posted to its own endpoint, which has its own key. */
  substituteVariantId?: number;
  quantityPicked?: string;
}

export interface PickExceptionResult {
  pickLineId: number;
  reason: PickExceptionReason;
  status: PickExceptionStatus;
  ownerUserId: string | null;
  substituteVariantId: number | null;
  substituteQuantity: string | null;
  quantityPicked: string;
  waveComplete: boolean;
  reportedBy: string;
}


type QueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const WAVE_READ_KEY = "inventory:sales-orders:read";
const WAVE_WRITE_KEY = "inventory:sales-orders:ship";
/**
 * B5. Two keys of their own, and the split is the point: swapping a SKU at the
 * shelf changes what the customer is owed, and signing off a write-off is a
 * supervisor's job — neither is the same authority as walking a wave.
 */
const SUBSTITUTE_KEY = "inventory:picking:substitute";
const EXCEPTION_REVIEW_KEY = "inventory:picking:review";

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
  return useIdempotentMutation<CreatePickWaveResult, Error, CreatePickWaveInput>({
    mutationKey: ["inventory", "picking", "createWave"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<CreatePickWaveResult>("/inventory/picking/waves", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useClaimPickWave() {
  const qc = useQueryClient();
  return useIdempotentMutation<{ pickListId: number; assignedTo: string; claimed: boolean }, Error, number>({
    mutationKey: ["inventory", "picking", "claim"],
    mutationFn: (pickListId, idempotencyKey) =>
      apiClient.post(`/inventory/picking/waves/${pickListId}/claim`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
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
  return useIdempotentMutation<
    { pickListId: number; assignedTo: string },
    Error,
    { pickListId: number; assigneeUserId: string }
  >({
    mutationKey: ["inventory", "picking", "reassign"],
    mutationFn: ({ pickListId, assigneeUserId }, idempotencyKey) =>
      apiClient.post(`/inventory/picking/waves/${pickListId}/reassign`, { assigneeUserId }, { headers: { "Idempotency-Key": idempotencyKey } }),
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
  return useIdempotentMutation<ConfirmPickResult, Error, ConfirmPickInput>({
    mutationKey: ["inventory", "picking", "confirm"],
    mutationFn: ({ pickListId, pickLineId, quantityPicked, locationId, scannedPayload }, idempotencyKey) =>
      apiClient.post<ConfirmPickResult>(
        `/inventory/picking/waves/${pickListId}/confirm`,
        {
          pickLineId,
          quantityPicked,
          ...(locationId !== undefined ? { locationId } : {}),
          ...(scannedPayload !== undefined ? { scannedPayload } : {}),
        }, { headers: { "Idempotency-Key": idempotencyKey } },
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

/**
 * B5. Two endpoints behind one hook, because they are one act at the shelf.
 *
 * `SUBSTITUTED` posts to `/substitute`, which carries
 * `inventory:picking:substitute`; every other reason posts to `/exception`,
 * which carries the picker's own key. The server splits them because
 * `PermissionGuard` reads exactly one permission per handler, and a single route
 * covering every reason could only be gated at the weakest of them.
 *
 * Reporting an exception now releases the reservation on the unpicked remainder,
 * and a substitution moves the reservation onto the new SKU and rewrites the
 * sales-order line — so reservations, stock levels and the sales-order lists are
 * all stale afterwards, not just the wave.
 */
export function useReportPickException() {
  const qc = useQueryClient();
  return useIdempotentMutation<PickExceptionResult, Error, ReportPickExceptionInput>({
    mutationKey: ["inventory", "picking", "exception"],
    mutationFn: ({
      pickListId,
      pickLineId,
      reason,
      notes,
      foundLocationId,
      substituteVariantId,
      quantityPicked,
    }, idempotencyKey) =>
      reason === "SUBSTITUTED"
        ? apiClient.post<PickExceptionResult>(
            `/inventory/picking/waves/${pickListId}/substitute`,
            {
              pickLineId,
              substituteVariantId,
              quantityPicked,
              ...(notes ? { notes } : {}),
            }, { headers: { "Idempotency-Key": idempotencyKey } },
          )
        : apiClient.post<PickExceptionResult>(
            `/inventory/picking/waves/${pickListId}/exception`,
            {
              pickLineId,
              reason,
              ...(notes ? { notes } : {}),
              ...(reason === "WRONG_LOCATION" && foundLocationId !== undefined
                ? { foundLocationId }
                : {}),
            }, { headers: { "Idempotency-Key": idempotencyKey } },
          ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.exceptionsList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}


export { WAVE_READ_KEY, WAVE_WRITE_KEY, SUBSTITUTE_KEY, EXCEPTION_REVIEW_KEY };
