import type { CalendarListItem } from "@/hooks/api/calendar";
import { formatEventTimeRange, fromZonedWallClock, zonedWallClock } from "@/lib/date-utils";
import { calendarProjectionFields } from "./calendar-projection-fixtures";
import { buildEventPayload } from "./event-create-validators";
import { describeEventConflicts } from "./event-conflict-notice";
import { toDefaultForm, toEditForm } from "./event-form-state";
import { eventOverlapsRange, toBigCalEvent } from "./use-calendar-computed";

const IST = "Asia/Kolkata";
const NEW_YORK = "America/New_York";

function timedEvent(id: string, start: string, end: string, timezone: string | null = IST): CalendarListItem {
  return {
    id,
    title: id,
    start,
    end,
    allDay: false,
    category: "meeting",
    source: "event",
    timezone,
    ...calendarProjectionFields(id, start, end, false, timezone),
  };
}

function allDayEvent(id: string, start: string, end: string, timezone: string): CalendarListItem {
  return {
    id,
    title: id,
    start,
    end,
    allDay: true,
    category: "general",
    source: "event",
    timezone,
    ...calendarProjectionFields(id, start, end, true, timezone),
  };
}

afterEach(() => jest.useRealTimers());

describe("CAL-B-001 the calendar renders in the account zone whatever the device zone (run under TZ=UTC and the machine zone)", () => {
  it("places a 6:16 PM IST event at 6:16 PM in the grid, not at 12:46", () => {
    const grid = toBigCalEvent(timedEvent("past-check", "2026-10-14T12:46:00.000Z", "2026-10-14T13:46:00.000Z"), [], IST);
    expect([grid.start.getHours(), grid.start.getMinutes()]).toEqual([18, 16]);
    expect([grid.end.getHours(), grid.end.getMinutes()]).toEqual([19, 16]);
  });

  it("keeps a multi-day all-day event on its own dates whatever the zones", () => {
    const grid = toBigCalEvent(allDayEvent("offsite", "2026-10-26T18:30:00.000Z", "2026-10-29T18:30:00.000Z", IST), [], IST);
    expect([grid.start.getDate(), grid.end.getDate()]).toEqual([27, 29]);
    expect(grid.start.getHours()).toBe(0);
  });

  it("round-trips a dropped grid slot back to the same instant", () => {
    const instant = new Date("2026-10-21T04:30:00.000Z");
    const wall = zonedWallClock(instant, IST);
    expect([wall.getHours(), wall.getMinutes()]).toEqual([10, 0]);
    expect(fromZonedWallClock(wall, IST).toISOString()).toBe(instant.toISOString());
  });

  it("opens New Event at the IST clock, not the UTC one", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-15T15:58:00.000Z"));
    const form = toDefaultForm(null, IST);
    expect([form.startDate, form.startTime]).toEqual(["2026-10-15", "21:28"]);
  });

  it("CAL-B-002 saves a 10:00-11:00 entry as IST and declares the account zone", () => {
    const form = { ...toDefaultForm(null, IST), startDate: "2026-10-21", startTime: "10:00", endDate: "2026-10-21", endTime: "11:00" };
    const result = buildEventPayload({ form, showEndDate: true, linkedTicket: null, existingEntityId: null, isEdit: false, timeZone: IST });
    expect(result.error).toBeNull();
    expect(result.payload).toEqual(expect.objectContaining({
      startDate: "2026-10-21T04:30:00.000Z",
      endDate: "2026-10-21T05:30:00.000Z",
      timezone: IST,
    }));
  });

  it("saves an all-day entry at midnight of its own date in the all-day zone", () => {
    const form = { ...toDefaultForm(null, IST), allDay: true, startDate: "2026-10-27", endDate: "2026-10-29" };
    const result = buildEventPayload({ form, showEndDate: true, linkedTicket: null, existingEntityId: null, isEdit: false, timeZone: IST, allDayTimeZone: IST });
    expect(result.payload).toEqual(expect.objectContaining({ startDate: "2026-10-26T18:30:00.000Z", allDay: true }));
  });

  it("edits a timed event at the IST clock and an all-day event on its stored dates", () => {
    const timed = toEditForm(timedEvent("past-check", "2026-10-14T12:46:00.000Z", "2026-10-14T13:46:00.000Z"), null, IST);
    expect([timed.startDate, timed.startTime, timed.endTime]).toEqual(["2026-10-14", "18:16", "19:16"]);
    const allDay = toEditForm(allDayEvent("offsite", "2026-10-26T18:30:00.000Z", "2026-10-29T18:30:00.000Z", IST), null, IST);
    expect([allDay.startDate, allDay.endDate]).toEqual(["2026-10-27", "2026-10-29"]);
  });

  it("puts a Monday 00:30 IST event in the IST week, which starts on Sunday evening UTC", () => {
    const event = timedEvent("early", "2026-10-18T19:00:00.000Z", "2026-10-18T19:30:00.000Z");
    const istWeek = {
      start: fromZonedWallClock(new Date(2026, 9, 19), IST),
      end: fromZonedWallClock(new Date(2026, 9, 26), IST),
    };
    expect(eventOverlapsRange(event, istWeek, IST)).toBe(true);
    const utcWeek = {
      start: fromZonedWallClock(new Date(2026, 9, 19), "UTC"),
      end: fromZonedWallClock(new Date(2026, 9, 26), "UTC"),
    };
    expect(eventOverlapsRange(event, utcWeek, "UTC")).toBe(false);
  });

  it("reads list times in the account zone without a UTC suffix", () => {
    const label = formatEventTimeRange("2026-10-21T04:30:00.000Z", "2026-10-21T05:30:00.000Z", IST, IST);
    expect(label).toContain("10:00");
    expect(label).not.toContain("UTC");
  });

  it("names the clash time in the account zone", () => {
    expect(describeEventConflicts({
      eventConflicts: [{ eventId: 1, title: "TZ probe", startDate: "2026-10-21T04:30:00.000Z", endDate: "2026-10-21T05:30:00.000Z", allDay: false, timezone: IST }],
    }, IST)).toBe(`it clashes with "TZ probe" at 10:00 AM`);
  });
});

describe("CAL-B-001 an America/New_York account across the November 2026 DST change", () => {
  it("keeps 9:00 AM on the wall clock on both sides of the change", () => {
    expect(fromZonedWallClock(new Date(2026, 9, 31, 9, 0), NEW_YORK).toISOString()).toBe("2026-10-31T13:00:00.000Z");
    expect(fromZonedWallClock(new Date(2026, 10, 2, 9, 0), NEW_YORK).toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("shows both 1:30 AM readings of the repeated hour as 1:30 in the grid", () => {
    const edt = zonedWallClock(new Date("2026-11-01T05:30:00.000Z"), NEW_YORK);
    const est = zonedWallClock(new Date("2026-11-01T06:30:00.000Z"), NEW_YORK);
    expect([edt.getHours(), edt.getMinutes(), est.getHours(), est.getMinutes()]).toEqual([1, 30, 1, 30]);
  });

  it("saves a weekly 9:00 AM entry made after the change at the EST offset", () => {
    const form = { ...toDefaultForm(null, NEW_YORK), startDate: "2026-11-02", startTime: "09:00", endDate: "2026-11-02", endTime: "09:30" };
    const result = buildEventPayload({ form, showEndDate: true, linkedTicket: null, existingEntityId: null, isEdit: false, timeZone: NEW_YORK });
    expect(result.payload).toEqual(expect.objectContaining({ startDate: "2026-11-02T14:00:00.000Z", timezone: NEW_YORK }));
  });

  it("moves the grid clock back an hour for the same instant after the change", () => {
    const before = toBigCalEvent(timedEvent("standup", "2026-10-30T13:00:00.000Z", "2026-10-30T13:15:00.000Z", NEW_YORK), [], NEW_YORK);
    const after = toBigCalEvent(timedEvent("standup", "2026-11-02T13:00:00.000Z", "2026-11-02T13:15:00.000Z", NEW_YORK), [], NEW_YORK);
    expect([before.start.getHours(), after.start.getHours()]).toEqual([9, 8]);
  });
});
