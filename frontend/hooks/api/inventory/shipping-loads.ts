"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { LoadStatus } from "@/features/inventory/lib";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  CreateLoadInput,
  Load,
  LoadDetail,
} from "@/hooks/api/inventory/shipping-loads-schema";

export type { Load, LoadDetail, CreateLoadInput } from "@/hooks/api/inventory/shipping-loads-schema";

const loadListContract = lazyContract(() =>
  import("@/hooks/api/inventory/shipping-loads-schema").then((m) => m.loadListContract),
);
const loadDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/shipping-loads-schema").then((m) => m.loadDetailContract),
);
const loadContract = lazyContract(() =>
  import("@/hooks/api/inventory/shipping-loads-schema").then((m) => m.loadContractSingle),
);

interface LoadListResponse {
  items: Load[];
  total: number;
  page: number;
  totalPages: number;
}

interface LoadsQueryParams {
  [key: string]: unknown;
  status?: LoadStatus;
  carrierId?: number;
  page?: number;
  limit?: number;
}

export function useLoads(params?: LoadsQueryParams) {
  const canView = useCan("inventory:loads:manage");
  return useQuery<LoadListResponse, Error>({
    queryKey: queryKeys.inventory.loads(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/loads",
        {
          status: params?.status,
          carrierId: params?.carrierId,
          page: params?.page,
          limit: params?.limit,
        },
        signal,
        loadListContract,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useLoad(loadId: number) {
  const canView = useCan("inventory:loads:manage");
  return useQuery<LoadDetail, Error>({
    queryKey: queryKeys.inventory.load(loadId),
    queryFn: ({ signal }) =>
      apiClient.get(`/inventory/loads/${loadId}`, undefined, signal, loadDetailContract),
    enabled: canView && loadId > 0,
    staleTime: 60_000,
  });
}

export function useCreateLoad() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<Load, Error, CreateLoadInput>("inventory:loads:manage", {
    mutationKey: ["inventory", "load", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post(
        "/inventory/loads",
        data,
        { headers: { "Idempotency-Key": idempotencyKey } },
        loadContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useDispatchLoad() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<Load, Error, number>("inventory:loads:manage", {
    mutationKey: ["inventory", "load", "dispatch"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post(
        `/inventory/loads/${loadId}/dispatch`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
        loadContract,
      ),
    onSuccess: (_, loadId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCloseLoad() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<Load, Error, number>("inventory:loads:manage", {
    mutationKey: ["inventory", "load", "close"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post(
        `/inventory/loads/${loadId}/close`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
        loadContract,
      ),
    onSuccess: (_, loadId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}

export function useCancelLoad() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<Load, Error, number>("inventory:loads:manage", {
    mutationKey: ["inventory", "load", "cancel"],
    mutationFn: (loadId, idempotencyKey) =>
      apiClient.post(
        `/inventory/loads/${loadId}/cancel`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
        loadContract,
      ),
    onSuccess: (_, loadId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.load(loadId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.loads() });
    },
  });
}
