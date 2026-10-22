"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
    queryFn: ({ signal }) =>
      apiClient.get<PickWaveListResponse>("/inventory/picking/waves", {
        page: String(params.page),
        limit: String(params.limit),
        assignment: params.assignment,
        ...(params.status ? { status: params.status } : {}),
        ...(params.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }, signal),
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
    queryFn: ({ signal }) =>
      apiClient.get<PickWaveDetail>(
        `/inventory/picking/waves/${pickListId}`,
        undefined,
        signal,
      ),
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

export interface WaveJoinDecision {
  join: boolean;
  waveId: number | null;
  reason: string | null;
}

export function useProposeWaveJoin() {
  return useAuthorizedMutation<WaveJoinDecision, Error, CreatePickWaveInput>(
    "inventory:sales-orders:ship",
    {
      mutationKey: ["inventory", "picking", "proposeJoin"],
      mutationFn: (data) =>
        apiClient.post<WaveJoinDecision>("/inventory/picking/waves/propose-join", data),
    },
  );
}

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
  return useAuthorizedMutation<
    { pickListId: number; assignedTo: null; released: boolean },
    Error,
    number
  >("inventory:sales-orders:ship", {
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
