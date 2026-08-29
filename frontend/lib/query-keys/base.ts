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
