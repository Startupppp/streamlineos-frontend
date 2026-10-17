import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

export const noContentContract = z.void();

/**
 * The keyset page the backend's shared `buildCursorPage` helper emits. It is
 * `{ limit, hasMore, nextCursor }` — never `{ page, total, totalPages }`, and
 * `nextCursor` is `null` on the last page rather than absent.
 *
 * A hand-rolled reader elsewhere in the API spells the same three keys under
 * `pageInfo` instead of `pagination`; `cursorPageInfoContract` is that variant.
 * They are not interchangeable, so each has its own factory.
 */

export const cursorPaginationContract = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export function cursorPageContract<T>(
  item: ResponseContract<T>,
): ResponseContract<{
  data: T[];
  pagination: z.infer<typeof cursorPaginationContract>;
}> {
  return z.object({
    data: z.array(item),
    pagination: cursorPaginationContract,
  });
}

/**
 * The same keyset page from an endpoint that opted into reporting a denominator
 * through the backend's `buildCursorPageWithTotal`.
 *
 * A separate factory rather than an optional `total` on the shared one, because a
 * total costs the second count query the keyset design exists to avoid, and only a
 * handful of endpoints send it. Reading it where it is absent would silently give
 * `undefined` to a caller rendering a figure.
 */
export const cursorPaginationWithTotalContract = cursorPaginationContract.extend({
  total: z.number(),
});

export function cursorPageWithTotalContract<T>(
  item: ResponseContract<T>,
): ResponseContract<{
  data: T[];
  pagination: z.infer<typeof cursorPaginationWithTotalContract>;
}> {
  return z.object({
    data: z.array(item),
    pagination: cursorPaginationWithTotalContract,
  });
}

export interface IdCursorPage<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: number | null;
}

export function idCursorPageContract<T>(
  item: ResponseContract<T>,
): ResponseContract<IdCursorPage<T>> {
  return z.object({
    data: z.array(item),
    hasMore: z.boolean(),
    nextCursor: z.number().int().nullable(),
  });
}

export function cursorPageInfoContract<T>(
  item: ResponseContract<T>,
): ResponseContract<{
  data: T[];
  pageInfo: z.infer<typeof cursorPaginationContract>;
}> {
  return z.object({
    data: z.array(item),
    pageInfo: cursorPaginationContract,
  });
}
