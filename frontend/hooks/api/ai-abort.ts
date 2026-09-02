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
