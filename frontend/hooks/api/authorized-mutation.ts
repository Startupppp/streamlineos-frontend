"use client";

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  type MutationFunctionContext,
} from "@tanstack/react-query";
import { useAccess, useCan } from "@/hooks/api/access";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

function grants(access: AccessResponse | undefined, permission: PermissionKey): boolean {
  if (!access) return false;
  return access.isOrgOwner || permission in access.scopes;
}

/**
 * Client-side mutation guard. The backend remains authoritative, but this
 * seam prevents a disabled UI from issuing commands while access is loading
 * or absent. Permission selection is centralized by mutation namespace so a
 * newly added call site cannot silently omit the guard.
 *
 * An unresolved access snapshot is `pending`, not `denied` — refusing there
 * would tell a permitted user who acted early that they lack access, so the
 * guard resolves the snapshot first and only then decides.
 */
export function useAuthorizedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  permission: PermissionKey,
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const allowed = useCan(permission);
  const { data: access, refetch } = useAccess();
  return useMutation({
    ...options,
    mutationFn: async (
      variables: TVariables,
      context: MutationFunctionContext,
    ) => {
      if (!options.mutationFn) {
        throw new Error("Authorized mutation requires a mutation function");
      }
      const granted = access ? allowed : grants((await refetch()).data, permission);
      if (!granted) {
        throw new Error(`Missing permission: ${permission}`);
      }
      return options.mutationFn(variables, context);
    },
  });
}
