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
