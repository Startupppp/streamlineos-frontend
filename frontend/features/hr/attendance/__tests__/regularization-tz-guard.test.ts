import { toIsoOnDateInOrgTz } from "@/lib/date-utils";

describe("HRMS-014: regularization check-in guard uses org-tz ISO comparison", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("accepts 18:00 IST when the wall-clock UTC is 17:23 (18:00 IST = 12:30 UTC, already past)", () => {
    jest.setSystemTime(new Date("2026-10-14T17:23:00.000Z"));
    const nowIso = new Date().toISOString();
    expect(toIsoOnDateInOrgTz("2026-10-14", "18:00", "Asia/Kolkata") > nowIso).toBe(false);
  });

  it("rejects 23:30 IST when the wall-clock UTC is 17:23 (23:30 IST = 18:00 UTC, still future)", () => {
    jest.setSystemTime(new Date("2026-10-14T17:23:00.000Z"));
    const nowIso = new Date().toISOString();
    expect(toIsoOnDateInOrgTz("2026-10-14", "23:30", "Asia/Kolkata") > nowIso).toBe(true);
  });

  it("old HH:MM comparison evaluated UTC hours against local time, causing false rejections in UTC environments", () => {
    const utcHoursAtBugTime = "17:23";
    const localEntryThatShouldBeInPast = "18:00";
    expect(localEntryThatShouldBeInPast > utcHoursAtBugTime).toBe(true);
  });
});
