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
    const continued = page({ coverageState: "continued", coverage: [{ sourceKey: "calendar-events", state: "continued", nextCursor: "next" }], nextCursor: "next" });
    expect(calendarSearchIsPartial([continued, page()], false)).toBe(false);
  });

  it("keeps source truncation and failed coverage visible after paging ends", () => {
    expect(calendarSearchIsPartial([page({ truncated: true })], false)).toBe(true);
    expect(calendarSearchIsPartial([page({ coverage: [{ sourceKey: "hr-leaves", state: "failed", nextCursor: null }] })], false)).toBe(true);
    expect(calendarSearchIsPartial([page({ coverage: [{ sourceKey: "hr-leaves", state: "failed", nextCursor: null }], nextCursor: "next" }), page()], false)).toBe(true);
  });

  it("keeps a terminal server partial state visible when source details are absent", () => {
    expect(calendarSearchIsPartial([page({ coverageState: "partial", coverage: [] })], false)).toBe(true);
    expect(calendarSearchIsPartial([page({ coverageState: "failed", coverage: [] })], false)).toBe(true);
    expect(calendarSearchIsPartial([page({ failures: [{ key: "build", label: "Build" }], coverage: [] })], false)).toBe(true);
  });
});
