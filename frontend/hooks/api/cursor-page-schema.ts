import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

export const noContentContract = z.void();


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
