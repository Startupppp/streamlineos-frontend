import type { InfiniteData } from "@tanstack/react-query";

export function selectFlatPages<T>(result: InfiniteData<{ data: T[] }>): T[] {
  return result.pages.flatMap((page) => page.data);
}
