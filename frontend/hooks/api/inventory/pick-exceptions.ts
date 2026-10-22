"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import {
  type PickExceptionOwnership,
  type PickExceptionReason,
  type PickExceptionResolution,
  type PickExceptionStatus,
} from "./picking";


type QueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

export interface PickExceptionSummary {
  pickLineId: number;
  pickListId: number;
  pickNumber: string;
  soNumber: string | null;
  soLineId: number | null;
  reason: PickExceptionReason;
  status: PickExceptionStatus;
  resolution: PickExceptionResolution | null;
  notes: string | null;
  resolutionNotes: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  reportedBy: string | null;
  reportedByName: string | null;
  reportedAt: string | null;
  resolvedAt: string | null;
  sku: string;
  variantName: string;
  substituteSku: string | null;
  substituteQuantity: string | null;
  quantityToPick: string;
  quantityPicked: string;
  locationCode: string | null;
  foundLocationCode: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  blocksWave: boolean;
}

export interface PickExceptionListResponse {
  items: PickExceptionSummary[];
  total: number;
  page: number;
  totalPages: number;
  openCount: number;
}

export interface PickExceptionFilters {
  page?: number;
  limit?: number;
  status?: PickExceptionStatus;
  reason?: PickExceptionReason;
  warehouseId?: number;
  ownership?: PickExceptionOwnership;
}

export function usePickExceptions(
  filters?: PickExceptionFilters,
  options?: QueryOptions<PickExceptionListResponse>,
) {
  const canReview = useCan("inventory:picking:review");
  const params = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 25,
    ownership: filters?.ownership ?? "ANY",
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.reason ? { reason: filters.reason } : {}),
    ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
  };

  return useQuery<PickExceptionListResponse, Error>({
    queryKey: queryKeys.picking.exceptions(params),
    queryFn: ({ signal }) =>
      apiClient.get<PickExceptionListResponse>("/inventory/picking/exceptions", {
        page: String(params.page),
        limit: String(params.limit),
        ownership: params.ownership,
        ...(params.status ? { status: params.status } : {}),
        ...(params.reason ? { reason: params.reason } : {}),
        ...(params.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }, signal),
    staleTime: 15_000,
    ...options,
    enabled: canReview && (options?.enabled ?? true),
  });
}

export function useResolvePickException() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    {
      pickLineId: number;
      status: PickExceptionStatus;
      resolution: PickExceptionResolution;
      resolvedBy: string;
      waveComplete: boolean;
    },
    Error,
    {
      pickLineId: number;
      pickListId: number;
      resolution: PickExceptionResolution;
      notes: string;
    }
  >({
    mutationKey: ["inventory", "picking", "resolveException"],
    mutationFn: ({ pickLineId, resolution, notes }, idempotencyKey) =>
      apiClient.post(`/inventory/picking/exceptions/${pickLineId}/resolve`, {
        resolution,
        notes,
      }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.exceptionsList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
    },
  });
}

export function useAssignPickException() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    { pickLineId: number; ownerUserId: string },
    Error,
    { pickLineId: number; pickListId: number; ownerUserId: string }
  >({
    mutationKey: ["inventory", "picking", "assignException"],
    mutationFn: ({ pickLineId, ownerUserId }, idempotencyKey) =>
      apiClient.post(`/inventory/picking/exceptions/${pickLineId}/assign`, { ownerUserId }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.exceptionsList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
    },
  });
}
