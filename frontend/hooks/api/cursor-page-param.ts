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
