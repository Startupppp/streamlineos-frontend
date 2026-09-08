/**
 * The "no cursor yet" seed for a string-cursor `useInfiniteQuery`.
 *
 * TanStack infers `TPageParam` from `initialPageParam`, and a bare `undefined`
 * infers as `undefined`, so every cursor hook in this tree wrote
 * `initialPageParam: undefined as string | undefined` to widen it — and then a
 * second assertion (`pageParam as string`) inside `queryFn` to get it back.
 * Neither is checked by TypeScript: the first is a claim about a literal, the
 * second silently survives the day the seed type changes.
 *
 * A DECLARATION does the same widening and is checked. `pageParam` then arrives
 * as `string | undefined`, and the `!== undefined` guard every one of these
 * hooks already writes narrows it to `string` on its own.
 */
export const NO_CURSOR_YET: string | undefined = undefined;

/** The same seed for a numeric-cursor (id or offset) `useInfiniteQuery`. */
export const NO_ID_CURSOR_YET: number | undefined = undefined;

/**
 * The same seed for the hooks whose "no cursor" sentinel is `null` rather than
 * `undefined` — the two are not interchangeable here, because `getNextPageParam`
 * returning `undefined` is how TanStack marks the end of the list.
 */
export const NULL_CURSOR_YET: string | null = null;

/** The numeric half of `NULL_CURSOR_YET`. */
export const NULL_ID_CURSOR_YET: number | null = null;
