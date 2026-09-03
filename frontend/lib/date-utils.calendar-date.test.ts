import { formatShortDate, readerTimeZone } from "./date-utils";

const SHORT_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/**
 * The reader's zone as an EXPLICIT parameter rather than the runner's ambient one:
 * `process.env.TZ` cannot be changed inside a jest worker (jest replaces
 * `process.env` with a copy, so Node never gets the reassignment hook that resets
 * the cached zone — measured under both the jsdom and node environments). So the
 * defect is modelled here instead, and the ambient half is supplied by the non-UTC
 * CI leg.
 */
function dayInZone(zone: string, value: string): string {
  return new Intl.DateTimeFormat("en-IN", { ...SHORT_PARTS, timeZone: zone }).format(
    new Date(value),
  );
}

describe("formatShortDate reads a calendar date as a day, not as an instant", () => {
  it("renders the day the API sent, whatever zone the reader is in", () => {
    expect(formatShortDate("2026-07-12")).toBe("12 Jul 2026");
    expect(formatShortDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("BITE: projecting a bare YYYY-MM-DD into the reader's zone moves the day west of UTC", () => {
    expect(dayInZone("America/New_York", "2026-07-12")).toBe("11 Jul 2026");
    expect(dayInZone("America/Sao_Paulo", "2026-01-01")).toBe("31 Dec 2025");

    expect(formatShortDate("2026-07-12")).not.toBe(dayInZone("America/New_York", "2026-07-12"));
    expect(formatShortDate("2026-01-01")).not.toBe(dayInZone("America/Sao_Paulo", "2026-01-01"));
  });

  it("BITE: does not over-correct — a real instant still reads in the reader's own zone", () => {
    const instant = "2026-07-12T23:30:00.000Z";

    expect(formatShortDate(instant)).toBe(dayInZone(readerTimeZone(), instant));
    expect(dayInZone("Pacific/Auckland", instant)).toBe("13 Jul 2026");
    expect(dayInZone("America/New_York", instant)).toBe("12 Jul 2026");
  });

  it("still refuses input that is not a date at all", () => {
    expect(formatShortDate("2026-13-45")).toBe("");
    expect(formatShortDate("not a date")).toBe("");
    expect(formatShortDate(null)).toBe("");
  });
});
