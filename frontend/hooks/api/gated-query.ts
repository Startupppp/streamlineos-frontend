"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAccess } from "@/hooks/api/access";
import {
  gated,
  grantsPermission,
  permissionGate,
  type Gated,
} from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";

export { gated };
export type { Gated };

/**
 * A read that carries why it has no data.
 *
 * A disabled query in TanStack v5 reports `isPending: true, isFetching: false`,
 * so `isLoading` — which is the conjunction of the two — is false. A read gated
 * shut by a missing permission therefore looks exactly like a read that
 * finished and found nothing, and every surface downstream says "none yet".
 * `access` is the missing half of that answer, and it travels with the query so
 * no screen has to ask a second time and disagree.
 */
export type GatedQueryResult<TData, TError = Error> = Gated<
  UseQueryResult<TData, TError>
>;

/** The caller's own `enabled` is composed with the permission, never replacing it. */
export function useGatedQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  permission: PermissionKey,
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): GatedQueryResult<TData, TError> {
  const accessQuery = useAccess();
  const access = permissionGate(
    permission,
    grantsPermission(accessQuery.data, permission),
    accessQuery.data !== undefined,
    accessQuery.isError,
  );
  const query = useQuery({
    ...options,
    enabled: access.allowed && (options.enabled ?? true),
  });

  /**
   * Retrying a read whose PERMISSION could not be read has to retry the
   * permission. This query is disabled while access is unavailable, so its own
   * `refetch` is a no-op — a Retry button wired to it would spin for ever
   * against a recovered server (BUG-HRMS-014). Composed here so every gated
   * surface's existing Retry does the right thing without being rewired.
   */
  const refetch: typeof query.refetch = async (refetchOptions) => {
    if (accessQuery.isError) await accessQuery.refetch();
    return query.refetch(refetchOptions);
  };

  return gated({ ...query, refetch }, access);
}
