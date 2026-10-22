"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { usePermissionGate } from "@/hooks/api/access";
import { useQueryClient } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { gated, type Gated } from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";

export { gated };
export type { Gated };

export type GatedQueryResult<TData, TError = Error> = Gated<
  UseQueryResult<TData, TError>
>;

export function useGatedQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  permission: PermissionKey,
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): GatedQueryResult<TData, TError> {
  const access = usePermissionGate(permission);
  const queryClient = useQueryClient();
  const query = useQuery({
    ...options,
    enabled: access.allowed && (options.enabled ?? true),
  });

  const refetch: typeof query.refetch = async (refetchOptions) => {
    if (access.unavailable) {
      await queryClient.refetchQueries({ queryKey: platformCoreQueryKeys.access.me() });
    }
    return query.refetch(refetchOptions);
  };

  return gated({ ...query, refetch }, access);
}
