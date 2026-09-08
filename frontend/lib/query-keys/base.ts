export const queryKeyBase = ["streamlineos"] as const;

type NoAbortSignal = {
  readonly aborted?: never;
  readonly addEventListener?: never;
  readonly throwIfAborted?: never;
};

/**
 * The parameter bag a key factory embeds in its key.
 *
 * It was `Record<string, unknown>`, which an `interface` is never assignable to
 * — interfaces get no implicit index signature — so every hook holding a typed
 * params interface wrote `params as Record<string, unknown>` at the call site.
 * That cast checked nothing: it only restated a shape the factory never reads
 * field by field. A factory hashes the bag structurally, so the constraint it
 * actually needs is "an object", and the union below keeps object literals,
 * interfaces and Record shapes alike assignable.
 *
 * `NoAbortSignal` mirrors `QueryParams` in `lib/api-client.ts` and is the half
 * that must not be dropped: without it, widening past `Record` would newly
 * admit `AbortSignal` into a key slot, which hashes to a key nothing can
 * invalidate.
 */
export type QueryKeyParams =
  | ({ readonly [key: string]: unknown } & NoAbortSignal)
  | (object & NoAbortSignal);
