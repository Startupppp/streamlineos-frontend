import { formatEventDate, readerTimeZone } from "@/lib/date-utils";

const NEW_YORK = "America/New_York";

const LATE_NIGHT_UTC = "2026-03-08T02:30:00.000Z";

describe("formatEventDate renders the calendar date of the AUTHORED zone", () => {
  it("BITE: the same instant is the 7th in New York and the 8th in UTC", () => {
    const inNewYork = formatEventDate(LATE_NIGHT_UTC, NEW_YORK);
    const inUtc = formatEventDate(LATE_NIGHT_UTC, "UTC");

    expect(inNewYork).toContain("7");
    expect(inUtc).toContain("8");
    expect(inNewYork).not.toBe(inUtc);
  });

  it("accepts a Date as well as an ISO string, with the same result", () => {
    expect(formatEventDate(new Date(LATE_NIGHT_UTC), NEW_YORK)).toBe(
      formatEventDate(LATE_NIGHT_UTC, NEW_YORK),
    );
  });

  it("falls back to the reader's zone when the event carries none", () => {
    expect(formatEventDate(LATE_NIGHT_UTC, null)).toBe(
      formatEventDate(LATE_NIGHT_UTC, readerTimeZone()),
    );
  });

  it("BITE: degrades to the reader's zone rather than throwing on a zone the browser rejects", () => {
    expect(() => formatEventDate(LATE_NIGHT_UTC, "Mars/Olympus_Mons")).not.toThrow();
    expect(formatEventDate(LATE_NIGHT_UTC, "Mars/Olympus_Mons")).toBe(
      formatEventDate(LATE_NIGHT_UTC, readerTimeZone()),
    );
  });

  it("returns an empty string for an unparseable instant", () => {
    expect(formatEventDate("not-a-date", NEW_YORK)).toBe("");
  });
});
