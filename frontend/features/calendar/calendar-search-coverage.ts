import type { CalendarSearchResponse } from "@/hooks/api/calendar-types";

export function calendarSearchIsPartial(
  pages: CalendarSearchResponse[],
  hasNextPage: boolean,
): boolean {
  return hasNextPage || pages.some((page) =>
    page.coverage.some((source) => source.state !== "complete") ||
    (page.truncated && !page.nextCursor),
  );
}
