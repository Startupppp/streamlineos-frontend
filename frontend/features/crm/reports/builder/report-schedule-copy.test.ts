import type { ReportSchedule } from "@/types/crm/reporting";
import { describeSchedule } from "./report-schedule-copy";

/**
 * CRM-P2-08. Every schedule stores a weekday and a day-of-month whatever its
 * cadence, because the columns are NOT NULL — so the sentence has to be built
 * from the fields the cadence actually reads. Showing the others would tell an
 * operator they chose something that has no effect.
 */

const schedule = (over: Partial<ReportSchedule> = {}): ReportSchedule =>
  ({
    reportScheduleId: "s-1",
    cadence: "daily",
    hourOfDay: 8,
    dayOfWeek: 4,
    dayOfMonth: 17,
    enabled: true,
    runCount: 0,
    recipients: ["ops@test.invalid"],
    ...over,
  }) as ReportSchedule;

describe("describeSchedule", () => {
  it("does not mention a weekday a daily schedule ignores", () => {
    const sentence = describeSchedule(schedule());
    expect(sentence).toBe("Every day at 08:00");
    expect(sentence).not.toContain("Thursday");
    expect(sentence).not.toContain("17");
  });

  it("names the weekday a weekly schedule reads", () => {
    expect(describeSchedule(schedule({ cadence: "weekly" }))).toBe(
      "Every Thursday at 08:00",
    );
  });

  it("names the day a monthly schedule reads, and no weekday", () => {
    const sentence = describeSchedule(schedule({ cadence: "monthly", hourOfDay: 6 }));
    expect(sentence).toBe("Day 17 of each month at 06:00");
    expect(sentence).not.toContain("Thursday");
  });

  it("pads the hour so the times line up in a list", () => {
    expect(describeSchedule(schedule({ hourOfDay: 7 }))).toContain("07:00");
    expect(describeSchedule(schedule({ hourOfDay: 23 }))).toContain("23:00");
  });
});
