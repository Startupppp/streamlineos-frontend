import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

/**
 * The keyset page the backend's shared `buildIdCursorPage` helper emits for a list
 * ordered by a monotonic integer id. It is `{ data, hasMore, nextCursor }` — flat,
 * unlike the opaque-cursor page in `cursor-page-schema.ts`, whose three keys sit
 * under `pagination` and whose cursor is a string. They are not interchangeable.
 *
 * `nextCursor` is the id of the last row the page KEPT, so continuing with
 * `cursor=<nextCursor>` (`id < cursor`) can neither repeat nor skip a row.
 *
 * Getting the two shapes the wrong way round fails SILENTLY, which is why they
 * are separate contracts rather than one permissive schema: `getNextPageParam`
 * reads `lastPage.nextCursor` here and `lastPage.pagination.nextCursor` on the
 * opaque-cursor page, so a swap simply ends pagination at page one with no error
 * anywhere. `hooks/api/module-access/` kept a private byte-identical copy of this
 * builder until 2026-09-04, which is exactly how a divergence would have started.
 */
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
    nextCursor: z.number().nullable(),
  });
}
