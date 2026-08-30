"use client";

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  type MutationFunctionContext,
} from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

/**
 * Client-side mutation guard. The backend remains authoritative, but this
 * seam prevents a disabled UI from issuing commands while access is loading
 * or absent. Permission selection is centralized by mutation namespace so a
 * newly added call site cannot silently omit the guard.
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
  return useMutation({
    ...options,
    mutationFn: async (
      variables: TVariables,
      context: MutationFunctionContext,
    ) => {
      if (!allowed) {
        throw new Error(`Missing permission: ${permission}`);
      }
      if (!options.mutationFn) {
        throw new Error("Authorized mutation requires a mutation function");
      }
      return options.mutationFn(variables, context);
    },
  });
}
