import type { InfiniteData } from "@tanstack/react-query";

export type CursorPagination = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type Page<T> = {
  data: T[];
  pagination: CursorPagination;
};

export function selectFlatPages<T>(result: InfiniteData<Page<T>>): T[] {
  return result.pages.flatMap((page) => page.data);
}
