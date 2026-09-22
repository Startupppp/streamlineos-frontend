import { addDays, format, parseISO } from "date-fns";
import { getPresetRange } from "./period-presets";

function at(iso: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
}

afterEach(() => {
  jest.useRealTimers();
});

describe("getPresetRange – SEMIMONTHLY", () => {
  it("'last-period' on the 10th (first half) resolves to the SECOND half of the PREVIOUS month, not the current month", () => {
    at("2026-03-10T12:00:00");
    expect(getPresetRange("last-period", "SEMIMONTHLY")).toEqual({
      from: "2026-02-16",
      to: "2026-02-28",
    });
  });

  it("'last-period' on the 10th of January rolls back across the year boundary", () => {
    at("2026-01-10T12:00:00");
    expect(getPresetRange("last-period", "SEMIMONTHLY")).toEqual({
      from: "2025-12-16",
      to: "2025-12-31",
    });
  });

  it("'last-period' on the 20th (second half) still resolves to the FIRST half of the same month", () => {
    at("2026-03-20T12:00:00");
    expect(getPresetRange("last-period", "SEMIMONTHLY")).toEqual({
      from: "2026-03-01",
      to: "2026-03-15",
    });
  });
});

describe("getPresetRange – BIWEEKLY", () => {
  it("does not reset its 14-day grid at the calendar year boundary", () => {
    at("2026-12-31T12:00:00");
    const thisPeriod = getPresetRange("this-period", "BIWEEKLY");

    at("2027-01-01T12:00:00");
    const nextDayPeriod = getPresetRange("this-period", "BIWEEKLY");

    // Dec 31 and the following Jan 1 must fall in the same continuous block —
    // previously each was computed relative to its own year's January 1st,
    // so consecutive calendar days landed in disjoint, non-adjacent blocks.
    expect(nextDayPeriod).toEqual(thisPeriod);
  });

  it("'this-period' and 'last-period' partition every day with no gap across the year boundary", () => {
    at("2027-01-05T12:00:00");
    const thisPeriod = getPresetRange("this-period", "BIWEEKLY");
    const lastPeriod = getPresetRange("last-period", "BIWEEKLY");

    const nextDayIso = format(addDays(parseISO(lastPeriod.to), 1), "yyyy-MM-dd");

    expect(nextDayIso).toBe(thisPeriod.from);
  });
});
