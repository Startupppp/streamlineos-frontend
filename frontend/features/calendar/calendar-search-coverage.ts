import type { CalendarSearchResponse } from "@/hooks/api/calendar-types";

export function calendarSearchIsPartial(
  pages: CalendarSearchResponse[],
  hasNextPage: boolean,
): boolean {
  if (hasNextPage) return true;
  if (pages.some((page) => page.failures.length > 0)) return true;
  if (pages.some((page) => page.coverage.some((source) =>
    source.state === "failed" ||
    (source.state !== "complete" && !source.nextCursor),
  ))) return true;
  const terminalPage = pages.at(-1);
  if (!terminalPage) return false;
  return terminalPage.coverageState !== "complete" ||
    terminalPage.coverage.some((source) => source.state !== "complete") ||
    (terminalPage.truncated && !terminalPage.nextCursor);
}
