"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { AssetReturn } from "@/features/hr/asset-returns/asset-return-constants";

export interface CreateAssetReturnInput {
  userId: string;
  assetName: string;
  assetId?: number;
  condition?: string;
  notes?: string;
}

export interface MarkAssetReturnedInput {
  id: number;
  condition: string;
}

export function useAssetReturns(
  options?: Omit<UseQueryOptions<AssetReturn[], Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("hr:assets:view");
  return useQuery<AssetReturn[], Error>({
    queryKey: humanResourcesQueryKeys.hr.assetReturnsList(),
    queryFn: ({ signal }) =>
      apiClient.get<AssetReturn[]>("/hr/asset-returns", undefined, signal),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateAssetReturn(
  options?: UseMutationOptions<AssetReturn, Error, CreateAssetReturnInput>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "asset-returns", "create"],
    mutationFn: (data: CreateAssetReturnInput) =>
      apiClient.post<AssetReturn>("/hr/asset-returns", data),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assetReturnsList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useMarkAssetReturned(
  options?: UseMutationOptions<{ success: boolean }, Error, MarkAssetReturnedInput>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "asset-returns", "mark-returned"],
    mutationFn: ({ id, condition }: MarkAssetReturnedInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/asset-returns/${id}`, {
        status: "RETURNED",
        condition,
      }),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assetReturnsList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
