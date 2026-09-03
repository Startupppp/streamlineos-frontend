import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

/**
 * The offset page the backend's shared `buildListResponse` helper emits. It is
 * `{ items, total, page, pageSize, totalPages }` — the counted sibling of the
 * keyset page in `cursor-page-schema.ts`, and never interchangeable with it.
 *
 * Twenty-one paginated list routes used to answer with a bare array while still
 * taking `page` and `limit`, so a caller had no way to learn there was a next
 * page. They now answer with this envelope; a hook that only needs the rows
 * reads `.items` at its own boundary rather than pushing the shape into every
 * component.
 */
export interface OffsetPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function offsetPageContract<T>(
  item: ResponseContract<T>,
): ResponseContract<OffsetPage<T>> {
  return z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  });
}
