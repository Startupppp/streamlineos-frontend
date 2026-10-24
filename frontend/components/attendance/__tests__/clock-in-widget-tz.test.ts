import { formatClockInOrgTz, formatClockInParts } from "@/lib/date-utils";

const INSTANT_03_30Z = new Date("2026-10-14T03:30:00.000Z");

describe("formatClockInOrgTz – timezone safety", () => {
  it("renders 03:30Z as 9:00 AM in Asia/Kolkata (TZ-env independent)", () => {
    const parts = formatClockInParts(INSTANT_03_30Z, "Asia/Kolkata");
    expect(parts?.time).toMatch(/^9:00 AM$/i);
    expect(formatClockInOrgTz(INSTANT_03_30Z, "Asia/Kolkata")).toMatch(/^9:00 AM/i);
  });

  it("full clock string contains the IST date components for 03:30Z", () => {
    const parts = formatClockInParts(INSTANT_03_30Z, "Asia/Kolkata");
    expect(parts?.date.toUpperCase()).toContain("WED");
    expect(parts?.date).toContain("14");
    expect(parts?.date.toUpperCase()).toContain("OCT");
    expect(formatClockInOrgTz(INSTANT_03_30Z, "Asia/Kolkata")).not.toContain("2026");
  });

  it("returns empty string when orgTz is null so no browser-zone time flashes", () => {
    expect(formatClockInParts(INSTANT_03_30Z, null)).toBeNull();
    expect(formatClockInOrgTz(INSTANT_03_30Z, null)).toBe("");
  });
});
