import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

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
