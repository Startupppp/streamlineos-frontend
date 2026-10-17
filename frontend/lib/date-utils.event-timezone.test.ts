import {
  formatEventDate,
  endOfDayInTimeZone,
  formatEventTimeRange,
  readerTimeZone,
} from "./date-utils";

const START = "2027-03-10T03:30:00.000Z";
const END = "2027-03-10T04:00:00.000Z";

function timeIn(zone: string, iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(new Date(iso));
}

describe("formatEventTimeRange renders the authored zone, not the reader's", () => {
  it("labels the range with the authored zone and reads the clock in it", () => {
    const label = formatEventTimeRange(START, END, "Asia/Kolkata");

    expect(label).toContain("Asia/Kolkata");
    expect(label).toContain(timeIn("Asia/Kolkata", START));
    expect(label).toContain(timeIn("Asia/Kolkata", END));
  });

  it("BITE: the same instant in a different authored zone reads differently", () => {
    const kolkata = formatEventTimeRange(START, END, "Asia/Kolkata");
    const utc = formatEventTimeRange(START, END, "UTC");

    expect(kolkata).not.toBe(utc);
    expect(utc).toContain(timeIn("UTC", START));
  });

  it("BITE: a null zone does not invent one — it falls back to the reader's", () => {
    const label = formatEventTimeRange(START, END, null);

    expect(label).toContain(readerTimeZone());
    expect(label).toContain(timeIn(readerTimeZone(), START));
  });

  it("shows the reader's own reading alongside when the zones disagree", () => {
    const other = readerTimeZone() === "UTC" ? "Asia/Kolkata" : "UTC";
    const label = formatEventTimeRange(START, END, other);

    expect(label).toContain(other);
    expect(label).toContain(readerTimeZone());
    expect(label).toContain(timeIn(readerTimeZone(), START));
  });

  it("does not repeat itself when the authored zone IS the reader's", () => {
    const label = formatEventTimeRange(START, END, readerTimeZone());

    expect(label).not.toContain("(");
  });

  it("BITE: an unknown IANA zone degrades instead of throwing a RangeError", () => {
    expect(() => formatEventTimeRange(START, END, "Mars/Olympus_Mons")).not.toThrow();
    expect(formatEventTimeRange(START, END, "Mars/Olympus_Mons")).toContain(readerTimeZone());
  });

  it("returns an empty label for an unparseable instant rather than 'Invalid Date'", () => {
    expect(formatEventTimeRange("not-a-date", END, "UTC")).toBe("");
    expect(formatEventDate("not-a-date", "UTC")).toBe("");
  });
});

describe("formatEventDate", () => {
  it("renders an all-day date in the authored zone", () => {
    const utc = formatEventDate("2027-03-10T20:00:00.000Z", "UTC");
    const kolkata = formatEventDate("2027-03-10T20:00:00.000Z", "Asia/Kolkata");

    expect(utc).toContain("10");
    expect(kolkata).toContain("11");
  });
});

describe("endOfDayInTimeZone", () => {
  it("ends the day at 23:59:59 in the organisation's zone, not the reader's", () => {
    const now = new Date("2026-10-09T20:00:00.000Z");
    expect(endOfDayInTimeZone(now, "Asia/Kolkata").toISOString()).toBe("2026-10-10T18:29:59.000Z");
    expect(endOfDayInTimeZone(now, "America/New_York").toISOString()).toBe("2026-10-10T03:59:59.000Z");
  });

  it("crosses a daylight-saving change on the same local day", () => {
    const now = new Date("2026-03-08T06:00:00.000Z");
    expect(endOfDayInTimeZone(now, "America/New_York").toISOString()).toBe("2026-03-09T03:59:59.000Z");
  });

  it("falls back to the reader's zone for an unknown zone", () => {
    const now = new Date("2026-10-09T08:00:00.000Z");
    expect(endOfDayInTimeZone(now, "Mars/Olympus").getTime()).toBe(endOfDayInTimeZone(now, null).getTime());
  });
});
