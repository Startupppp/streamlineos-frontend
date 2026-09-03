/**
 * Variables carrier for the AbortSignal a metered AI mutation must forward.
 *
 * TanStack v5 gives a mutation no signal of its own — `MutationFunctionContext`
 * is `{ client, meta, mutationKey }` — so the only way a Stop button can reach
 * the outgoing request is for the surface to put its controller's signal in the
 * mutation's variables and for the `mutationFn` to hand it to `apiClient`.
 */
export interface AiAbortInput {
  signal?: AbortSignal;
}

/**
 * Variables for a metered AI mutation whose input is a bare scalar.
 *
 * A scalar cannot carry a signal, so widening `TVariables` to this union lets a
 * Stop-owning surface pass `{ value, signal }` while every existing `mutate(x)`
 * call site stays legal — the alternative, an object-only variables type, would
 * have to be landed together with an edit to every caller.
 */
export type AiAbortableScalar<T extends string | number> = T | ({ value: T } & AiAbortInput);

export function readAiAbortableScalar<T extends string | number>(
  input: AiAbortableScalar<T>,
): { value: T; signal?: AbortSignal } {
  if (typeof input === "object") return { value: input.value, signal: input.signal };
  return { value: input };
}
