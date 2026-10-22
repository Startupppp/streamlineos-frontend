import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

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
  }).strict();
}
