"use client";

import { useCallback, useRef } from "react";
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAccess, useCan } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { randomId } from "@/lib/random-id";

/**
 * A mutation whose `Idempotency-Key` belongs to the operator's intent rather
 * than to the attempt.
 *
 * `authedFetch` already puts a key on every mutating request, and that is what
 * keeps a fenced endpoint from answering 400 — but it mints a fresh one per
 * fetch. A replay fence keys on the client sending *the same* key, so a
 * per-attempt key means the second attempt is, to the server, a different
 * command. The operator who submits, watches the spinner stall, and presses
 * again gets a second document on a route that is fully fenced.
 *
 * That is the whole defect: the auto-mint makes every request well-formed, so
 * nothing ever fails and nothing ever says the protection is absent.
 *
 * The key therefore lives here, across attempts, and is retired on two events:
 *
 *   - **on success** — the intent is finished, so the next submit is a new one
 *     and must be able to create a second, genuinely different document.
 *   - **when the payload changes** — otherwise an operator who submits, fails,
 *     corrects a field and submits again would send the original key with a new
 *     body, which the fence answers with 422. Correcting a form must not be an
 *     unrecoverable error.
 *
 * What survives is the case worth protecting: same intent, same payload, tried
 * again after a failure or a timeout. That reaches the server under one key and
 * is answered with the first response instead of creating a second row.
 */
export type IdempotentMutationOptions<TData, TError, TVariables> = Omit<
  UseMutationOptions<TData, TError, TVariables>,
  "mutationFn"
> & {
  /** Receives the key for this intent. Send it as the `Idempotency-Key` header. */
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
      // Structural, not referential: react-hook-form hands a new object to every
      // submit, so comparing by identity would mint a new key on each press and
      // reproduce exactly the defect this hook exists to remove.
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
    // Forwarded by arity rather than by name: react-query's onSuccess signature
    // has gained a parameter between minor versions, and naming three of four
    // silently drops the last one for every caller in the module.
    onSuccess: (...args: Parameters<NonNullable<typeof onSuccess>>) => {
      keyRef.current = null;
      payloadRef.current = null;
      onSuccess?.(...args);
    },
  });
}

/**
 * The permission gate of `useAuthorizedMutation` over the intent-scoped key.
 *
 * The two could not simply be nested: both wrap `useMutation`, and
 * `useAuthorizedMutation` hands its inner function react-query's own
 * `MutationFunctionContext` as a second argument. A hook that took the key
 * there would receive that context object instead and send `undefined` as the
 * header — well-formed enough to pass a smoke test, and no protection at all.
 *
 * It follows `useAuthorizedMutation` on an unresolved access snapshot: that is
 * `pending`, not `denied`, so the guard resolves the snapshot before deciding
 * rather than telling a permitted operator who acted early that they lack access.
 */
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

/**
 * `JSON.stringify` with object keys sorted at every depth, so two payloads that
 * differ only in property order compare equal. Without it a form that rebuilds
 * its object in a different order between attempts reads as a changed payload
 * and silently mints a new key.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val === null || typeof val !== "object" || Array.isArray(val)) return val;
    const record = val as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const name of Object.keys(record).sort()) sorted[name] = record[name];
    return sorted;
  });
}
