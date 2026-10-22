"use client";

import { useCallback, useRef } from "react";
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAccess, useCan } from "@/hooks/api/access";
import { isRecord } from "@/lib/is-record";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { randomId } from "@/lib/random-id";

export type IdempotentMutationOptions<TData, TError, TVariables> = Omit<
  UseMutationOptions<TData, TError, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
};

export function useIdempotentMutation<TData, TError = Error, TVariables = void>(
  options: IdempotentMutationOptions<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> {
  const { mutationFn, onSuccess, ...rest } = options;
  const keyRef = useRef<string | null>(null);
  const payloadRef = useRef<string | null>(null);

  const run = useCallback(
    (variables: TVariables): Promise<TData> => {
      const payload = stableStringify(variables);
      if (keyRef.current === null || payloadRef.current !== payload) {
        keyRef.current = randomId();
        payloadRef.current = payload;
      }
      return mutationFn(variables, keyRef.current);
    },
    [mutationFn],
  );

  return useMutation<TData, TError, TVariables>({
    ...rest,
    mutationFn: run,
    onSuccess: (...args: Parameters<NonNullable<typeof onSuccess>>) => {
      keyRef.current = null;
      payloadRef.current = null;
      onSuccess?.(...args);
    },
  });
}

export function useAuthorizedIdempotentMutation<TData, TError = Error, TVariables = void>(
  permission: PermissionKey,
  options: IdempotentMutationOptions<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> {
  const allowed = useCan(permission);
  const { data: access, refetch } = useAccess();
  const { mutationFn, ...rest } = options;
  return useIdempotentMutation<TData, TError, TVariables>({
    ...rest,
    meta: { ...rest.meta, permission },
    mutationFn: async (variables, idempotencyKey) => {
      const granted = access ? allowed : grantsPermission((await refetch()).data, permission);
      if (!granted) throw new Error(`Missing permission: ${permission}`);
      return mutationFn(variables, idempotencyKey);
    },
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (!isRecord(val)) return val;
    const sorted: Record<string, unknown> = {};
    for (const name of Object.keys(val).sort()) sorted[name] = val[name];
    return sorted;
  });
}
