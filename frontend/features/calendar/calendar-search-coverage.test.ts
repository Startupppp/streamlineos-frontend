import type { CalendarSearchResponse } from "@/hooks/api/calendar-types";
import { calendarSearchIsPartial } from "./calendar-search-coverage";

function page(overrides: Partial<CalendarSearchResponse> = {}): CalendarSearchResponse {
  return {
    events: [],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [{ sourceKey: "calendar-events", state: "complete", nextCursor: null }],
    nextCursor: null,
    ...overrides,
  };
}

describe("calendar search coverage", () => {
  it("distinguishes traversable result pages from incomplete source coverage", () => {
    const first = page({ truncated: true, coverageState: "partial", nextCursor: "next" });
    expect(calendarSearchIsPartial([first], true)).toBe(true);
    expect(calendarSearchIsPartial([first, page()], false)).toBe(false);
  });

  it("keeps source truncation and failed coverage visible after paging ends", () => {
    expect(calendarSearchIsPartial([page({ truncated: true })], false)).toBe(true);
    expect(calendarSearchIsPartial([page({ coverage: [{ sourceKey: "hr-leaves", state: "failed", nextCursor: null }] })], false)).toBe(true);
  });
});
