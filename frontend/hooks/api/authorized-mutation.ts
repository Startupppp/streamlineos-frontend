"use client";

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  type MutationFunctionContext,
} from "@tanstack/react-query";
import { useAccess, useCan } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";

const ACCESS_WAIT_MS = 5_000;

async function withinAccessWait<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("We couldn't confirm your access. Please try again.")),
      ACCESS_WAIT_MS,
    );
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

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
    meta: { ...options.meta, permission },
    mutationFn: async (
      variables: TVariables,
      context: MutationFunctionContext,
    ) => {
      if (!options.mutationFn) {
        throw new Error("Authorized mutation requires a mutation function");
      }
      let granted = allowed;
      if (!access) {
        const fresh = (await withinAccessWait(refetch())).data;
        if (!fresh) throw new Error("We couldn't confirm your access. Please try again.");
        granted = grantsPermission(fresh, permission);
      }
      if (!granted) {
        throw new Error(`Missing permission: ${permission}`);
      }
      return options.mutationFn(variables, context);
    },
  });
}
