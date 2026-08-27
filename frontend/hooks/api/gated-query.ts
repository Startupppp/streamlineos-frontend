"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { usePermissionGate, type PermissionGate } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

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
export type Gated<TResult> = TResult & { readonly access: PermissionGate };

export type GatedQueryResult<TData, TError = Error> = Gated<
  UseQueryResult<TData, TError>
>;

export function gated<TResult extends object>(
  result: TResult,
  access: PermissionGate,
): Gated<TResult> {
  return Object.assign({}, result, { access });
}

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
  const access = usePermissionGate(permission);
  const query = useQuery({
    ...options,
    enabled: access.allowed && (options.enabled ?? true),
  });
  return gated(query, access);
}
