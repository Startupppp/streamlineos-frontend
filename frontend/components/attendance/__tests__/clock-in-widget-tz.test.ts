import { formatClockInOrgTz } from "@/lib/date-utils";

const INSTANT_03_30Z = new Date("2026-10-14T03:30:00.000Z");

describe("formatClockInOrgTz – timezone safety", () => {
  it("renders 03:30Z as 09:00 AM in Asia/Kolkata (TZ-env independent)", () => {
    const result = formatClockInOrgTz(INSTANT_03_30Z, "Asia/Kolkata");
    expect(result).toMatch(/^09:00 AM/);
  });

  it("full clock string contains the IST date components for 03:30Z", () => {
    const result = formatClockInOrgTz(INSTANT_03_30Z, "Asia/Kolkata");
    expect(result).toContain("WED");
    expect(result).toContain("14");
    expect(result).toContain("OCT");
    expect(result).not.toContain("2026");
  });

  it("returns empty string when orgTz is null so no browser-zone time flashes", () => {
    expect(formatClockInOrgTz(INSTANT_03_30Z, null)).toBe("");
  });
});
