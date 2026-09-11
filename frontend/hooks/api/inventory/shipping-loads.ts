"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { LoadStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

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
  return useIdempotentMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "dispatch"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/dispatch`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCloseLoad() {
  const qc = useQueryClient();
  return useIdempotentMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "close"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/close`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCancelLoad() {
  const qc = useQueryClient();
  return useIdempotentMutation<Load, Error, number>({
    mutationKey: ["inventory", "load", "cancel"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post<Load>(`/inventory/loads/${loadId}/cancel`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, loadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}
