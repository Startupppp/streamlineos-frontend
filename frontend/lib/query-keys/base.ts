export const queryKeyBase = ["streamlineos"] as const;

/**
 * R2 — build a query key, dropping trailing `undefined`.
 *
 * An optional trailing argument that is not supplied still occupies a slot, so
 * `products()` yielded `[..., "products", undefined]`. TanStack's partial match
 * walks the *filter* key's own indexes, so that `undefined` was compared against
 * a stored params object and never matched: every no-argument
 * `invalidateQueries({ queryKey: products() })` was a silent no-op. Trimming the
 * gap makes a params-less call *be* the prefix, so it partial-matches every
 * filtered variant of the same list.
 */
export function trimKey(...parts: readonly unknown[]): readonly unknown[] {
  let end = parts.length;
  while (end > 0 && parts[end - 1] === undefined) end -= 1;
  return parts.slice(0, end);
}

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
