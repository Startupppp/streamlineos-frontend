import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { CalendarListItem, ExternalCalendarEventsResponse } from "@/hooks/api/calendar";
import { CalendarAgendaPreview } from "./calendar-lazy-fallbacks";
import {
  calendarSourceFamily,
  eventOverlapsRange,
  filterCalendarEventsBySources,
  mergeSelfAttendanceEvents,
  toBigCalEvent,
  useCalendarComputed,
} from "./use-calendar-computed";
import { calendarProjectionFields, externalProjectionFields } from "./calendar-projection-fixtures";

const CURRENT_DATE = new Date("2026-10-15T12:00:00.000Z");

function event(
  id: string,
  sourceKey: string,
  overrides: Partial<CalendarListItem> = {},
): CalendarListItem {
  return {
    id,
    title: id,
    start: "2026-10-15T09:00:00.000Z",
    end: "2026-10-15T10:00:00.000Z",
    allDay: false,
    category: "meeting",
    source: "calendar",
    ...overrides,
    ...calendarProjectionFields(
      id,
      overrides.start ?? "2026-10-15T09:00:00.000Z",
      overrides.end ?? "2026-10-15T10:00:00.000Z",
      overrides.allDay ?? false,
      overrides.timezone ?? null,
      sourceKey,
    ),
    actions: overrides.actions ?? { view: true, edit: false, delete: false, rsvp: false, complete: false },
  };
}

const EXTERNAL: ExternalCalendarEventsResponse = {
  events: [{
    id: "external-4-provider-1",
    connectionId: 4,
    toolkit: "googlecalendar",
    accountEmail: "person@example.com",
    providerEventId: "provider-1",
    title: "External",
    start: "2026-10-15T11:00:00.000Z",
    end: "2026-10-15T12:00:00.000Z",
    allDay: false,
    location: null,
    meetingUrl: "https://meet.example.com/one",
    webLink: "https://calendar.example.com/one",
    actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
    ...externalProjectionFields(4, "provider-1"),
  }],
  errors: [],
  complete: true,
  accounts: [],
};

describe("unified Calendar views", () => {
  it.each([
    ["2027-01-25T23:00:00Z", "2027-01-26T00:00:00Z", false],
    ["2027-01-27T00:00:00Z", "2027-01-27T01:00:00Z", false],
    ["2027-01-25T23:00:00Z", "2027-01-26T01:00:00Z", true],
    ["2027-01-26T00:00:00Z", "2027-01-26T01:00:00Z", true],
  ])("uses half-open display overlap for %s to %s", (start, end, expected) => {
    expect(eventOverlapsRange(event("boundary", "calendar-events", { start, end }), {
      start: new Date("2027-01-26T00:00:00Z"), end: new Date("2027-01-27T00:00:00Z"),
    })).toBe(expected);
  });

  it("positions a date-only item by its business date instead of its UTC instant", () => {
    const item = event("all-day", "calendar-events", {
      allDay: true, timezone: "Asia/Kolkata", start: "2027-01-25T18:30:00.000Z", end: "2027-01-26T18:29:59.999Z",
    });
    const grid = toBigCalEvent(item);

    expect([grid.start.getFullYear(), grid.start.getMonth(), grid.start.getDate()]).toEqual([2027, 0, 26]);
    expect([grid.end.getFullYear(), grid.end.getMonth(), grid.end.getDate()]).toEqual([2027, 0, 26]);
    expect(grid.start.getHours()).toBe(0);
    expect(grid.end.getHours()).toBe(23);
  });

  const events = [
    event("event-1", "calendar"),
    event("deal-1", "tasks", { entityType: "DEAL", source: "task" }),
    event("attendance-1", "hr-attendance", { source: "attendance" }),
    event("birthday-user-1", "hr-supplemental", { source: "hr", category: "birthday" }),
  ];

  it("uses the same canonical identities and action capabilities in Grid and List", () => {
    const { result } = renderHook(() => useCalendarComputed({
      events,
      externalData: EXTERNAL,
      hiddenIds: [],
      connections: [],
      currentDate: CURRENT_DATE,
      view: "day",
    }));
    expect(result.current.visibleEvents.map((item) => item.id)).toEqual(
      result.current.allCalEvents.map((item) => String(item.id)),
    );
    expect(result.current.allCalEvents.find((item) => item.id === "event-1")?.resource?.actions?.view).toBe(true);
  });

  it("applies HR, CRM, attendance, and account filters to canonical source families", () => {
    const { result } = renderHook(() => useCalendarComputed({
      events,
      externalData: EXTERNAL,
      hiddenIds: [4],
      connections: [],
      currentDate: CURRENT_DATE,
      view: "day",
      hrVisible: false,
      crmVisible: false,
      attendanceVisible: false,
    }));
    expect(result.current.visibleEvents.map((item) => item.id)).toEqual(["event-1"]);
    expect(calendarSourceFamily(events[1])).toBe("crm");
    expect(calendarSourceFamily(events[2])).toBe("attendance");
  });

  it("keeps every enabled source identity in Grid and List and applies the History source filter", () => {
    const allSources = [
      ...events,
      event("build-1", "build", { source: "build", entityType: "TICKET" }),
      event("task-1", "tasks", { source: "task" }),
    ];
    const { result } = renderHook(() => useCalendarComputed({
      events: allSources,
      externalData: EXTERNAL,
      hiddenIds: [],
      connections: [],
      currentDate: CURRENT_DATE,
      view: "day",
    }));
    const identities = ["event-1", "deal-1", "attendance-1", "birthday-user-1", "build-1", "task-1", "external-4-provider-1"];

    expect(result.current.visibleEvents.map((item) => item.id)).toEqual(identities);
    expect(result.current.allCalEvents.map((item) => item.id)).toEqual(identities);
    expect(filterCalendarEventsBySources(result.current.visibleEvents, {
      hrVisible: false,
      crmVisible: false,
      attendanceVisible: false,
      hiddenConnectionIds: [4],
    }).map((item) => item.id)).toEqual(["event-1", "build-1", "task-1"]);
  });

  it("includes overnight and multi-day items by interval overlap", () => {
    const day = {
      start: new Date("2026-10-15T00:00:00.000Z"),
      end: new Date("2026-10-15T23:59:59.999Z"),
    };
    expect(eventOverlapsRange(event("overnight", "calendar", {
      start: "2026-10-14T23:00:00.000Z",
      end: "2026-10-15T01:00:00.000Z",
    }), day)).toBe(true);
    expect(eventOverlapsRange(event("multi-day", "calendar", {
      start: "2026-10-10T00:00:00.000Z",
      end: "2026-10-20T00:00:00.000Z",
    }), day)).toBe(true);
    expect(eventOverlapsRange(event("outside", "calendar", {
      start: "2026-10-16T00:00:00.000Z",
      end: "2026-10-16T01:00:00.000Z",
    }), day)).toBe(false);
  });

  it("uses explicit dates for date-only range inclusion and attendance deduplication", () => {
    const attendance: CalendarListItem = {
      ...event("attendance-utc-boundary", "hr-attendance", { source: "attendance" }),
      start: "2026-10-14T10:00:00.000Z",
      end: "2026-10-14T10:00:00.000Z",
      allDay: true,
      timeKind: "date",
      time: { kind: "date", startDate: "2026-10-15", endDate: "2026-10-15" },
    };
    const overlay: CalendarListItem = {
      ...attendance,
      id: "attendance-overlay",
      start: "2026-10-15T12:00:00.000Z",
      end: "2026-10-15T12:00:00.000Z",
    };
    const day = {
      start: new Date("2026-10-15T00:00:00.000Z"),
      end: new Date("2026-10-15T23:59:59.999Z"),
    };

    expect(eventOverlapsRange(attendance, day)).toBe(true);
    expect(mergeSelfAttendanceEvents([attendance], [overlay])).toEqual([attendance]);
  });

  it("makes mobile rows use the same event selection contract and capability gate", () => {
    const select = jest.fn();
    render(
      <CalendarAgendaPreview
        events={[
          event("allowed", "calendar"),
          event("denied", "calendar", {
            actions: { view: false, edit: false, delete: false, rsvp: false, complete: false },
          }),
        ]}
        onSelectEvent={select}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^allowed\b/ }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: "allowed" }));
    expect(screen.getByRole("button", { name: /^denied\b/ })).toBeDisabled();
  });
});
