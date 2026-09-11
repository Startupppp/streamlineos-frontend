"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

import type {
  CreatePickWaveInput,
  CreatePickWaveResult,
  PickWaveDetail,
  PickWaveFilters,
  PickWaveListResponse,
} from "./picking-types";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

export * from "./picking-types";
export * from "./picking-shelf";

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

/**
 * NEO-14 — would these orders join a wave that is already open?
 *
 * A question, not a command: it reads and returns a decision, and the caller
 * then either joins or raises a new wave. Both routes were mounted and neither
 * was called, so waveless picking was a setting that changed nothing: every
 * release built a fresh wave and a building ended up with six half-full walks
 * where one full one would have done.
 */
export interface WaveJoinDecision {
  join: boolean;
  waveId: number | null;
  /** Why not, for a caller that has to explain itself. Null when it would join. */
  reason: string | null;
}

export function useProposeWaveJoin() {
  return useMutation<WaveJoinDecision, Error, CreatePickWaveInput>({
    mutationKey: ["inventory", "picking", "proposeJoin"],
    mutationFn: (data) =>
      apiClient.post<WaveJoinDecision>("/inventory/picking/waves/propose-join", data),
  });
}

/**
 * Append to a wave that is still only a plan.
 *
 * The gate is re-applied server-side against the wave as it stands now, not
 * against the proposal: a picker can claim the wave and confirm a line between
 * the two calls, and appending to a walk somebody has started is exactly what
 * the check refuses.
 */
export function useJoinPickWave() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    CreatePickWaveResult,
    Error,
    { pickListId: number } & CreatePickWaveInput
  >({
    mutationKey: ["inventory", "picking", "joinWave"],
    mutationFn: ({ pickListId, ...body }, idempotencyKey) =>
      apiClient.post<CreatePickWaveResult>(
        `/inventory/picking/waves/${pickListId}/join`,
        body,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
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

export { WAVE_READ_KEY, WAVE_WRITE_KEY, SUBSTITUTE_KEY, EXCEPTION_REVIEW_KEY };
