"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";

const assetReturnListC = lazyContract(() =>
  import("@/hooks/api/hr/asset-returns-schema").then((m) => m.assetReturnListContract),
);
const assetReturnC = lazyContract(() =>
  import("@/hooks/api/hr/asset-returns-schema").then((m) => m.assetReturnContract),
);
const assetReturnSuccessC = lazyContract(() =>
  import("@/hooks/api/hr/asset-returns-schema").then((m) => m.assetReturnSuccessContract),
);
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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
  assetReturnId: number;
  condition: string;
}

export function useAssetReturns(
  options?: Omit<UseQueryOptions<AssetReturn[], Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("hr:assets:view");
  return useQuery<AssetReturn[], Error>({
    queryKey: humanResourcesQueryKeys.hr.assetReturnsList(),
    queryFn: ({ signal }) =>
      apiClient.get<AssetReturn[]>("/hr/asset-returns", undefined, signal, assetReturnListC),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateAssetReturn(
  options?: UseMutationOptions<AssetReturn, Error, CreateAssetReturnInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AssetReturn, Error, CreateAssetReturnInput>("hr:assets:manage", {
    mutationKey: ["hr", "asset-returns", "create"],
    mutationFn: (data: CreateAssetReturnInput) =>
      apiClient.post<AssetReturn>("/hr/asset-returns", data, undefined, assetReturnC),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assetReturnsList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useMarkAssetReturned(
  options?: UseMutationOptions<AssetReturn, Error, MarkAssetReturnedInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AssetReturn, Error, MarkAssetReturnedInput>("hr:assets:manage", {
    mutationKey: ["hr", "asset-returns", "mark-returned"],
    mutationFn: ({ assetReturnId, condition }: MarkAssetReturnedInput) =>
      apiClient.patch<AssetReturn>(`/hr/asset-returns/${assetReturnId}`, {
        status: "RETURNED",
        condition,
      }, undefined, assetReturnC),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assetReturnsList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
