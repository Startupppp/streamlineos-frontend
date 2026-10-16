import { analyticsMonthWindow, availableAnalyticsMonths, currentAnalyticsMonth, defaultAnalyticsMonth } from "./calendar-analytics-month";

describe("Calendar analytics month window", () => {
  it("uses the organization's timezone to choose the current month", () => {
    const now = new Date("2026-11-01T00:30:00.000Z");
    expect(currentAnalyticsMonth("America/Los_Angeles", now)).toBe("2026-10");
    expect(currentAnalyticsMonth("Asia/Calcutta", now)).toBe("2026-11");
  });

  it("sends the first day of the selected month and the first day of the next month", () => {
    expect(analyticsMonthWindow("2026-10")).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(analyticsMonthWindow("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(analyticsMonthWindow("2028-02")).toEqual({ from: "2028-02-01", to: "2028-03-01" });
  });

  it("rejects partial date ranges and offers retained recent months", () => {
    expect(() => analyticsMonthWindow("2026-10-15")).toThrow("Invalid analytics month");
    const months = availableAnalyticsMonths("2026-01", 30);
    expect(months[0]).toEqual({ value: "2026-01", label: "January 2026" });
    expect(months[1]).toEqual({ value: "2025-12", label: "December 2025" });
  });

  it("defaults to the newest released and fully retained month at the release cutoff", () => {
    expect(defaultAnalyticsMonth("Asia/Calcutta", 365, new Date("2026-10-07T18:29:59.999Z"))).toBe("2026-08");
    expect(defaultAnalyticsMonth("Asia/Calcutta", 365, new Date("2026-10-07T18:30:00.000Z"))).toBe("2026-09");
    expect(defaultAnalyticsMonth("Asia/Calcutta", 30, new Date("2026-10-16T12:00:00.000Z"))).toBe("2026-10");
  });

  it("selects December across a year rollover only after its release cutoff", () => {
    expect(defaultAnalyticsMonth("Asia/Calcutta", 365, new Date("2027-01-07T18:29:59.999Z"))).toBe("2026-11");
    expect(defaultAnalyticsMonth("Asia/Calcutta", 365, new Date("2027-01-07T18:30:00.000Z"))).toBe("2026-12");
  });
});
