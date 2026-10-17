import {
  calendarEventsResponseContract,
  calendarHistoryResponseContract,
} from "./calendar-schema";

const event = {
  id: "calendar-1",
  title: "Planning",
  start: "2026-10-22T04:30:00.000Z",
  end: "2026-10-22T05:00:00.000Z",
  allDay: false,
  category: "meeting",
  source: "calendar",
  sourceKey: "calendar-events",
  sourceRecordId: "1",
  occurrenceId: "calendar-1",
  status: "confirmed",
  timeKind: "timed",
  time: {
    kind: "timed",
    start: "2026-10-22T04:30:00.000Z",
    end: "2026-10-22T05:00:00.000Z",
    timezone: "Asia/Calcutta",
  },
  availability: "busy",
  sourceVersion: "1",
  actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
  freshness: { state: "fresh", asOf: "2026-10-22T04:00:00.000Z" },
};

const response = {
  events: [event],
  failures: [],
  truncated: false,
  coverageState: "complete",
  coverage: [{ sourceKey: "calendar-events", state: "complete", nextCursor: null }],
};

it("accepts valid projected event, date-only, and History time fields", () => {
  expect(calendarEventsResponseContract.safeParse(response).success).toBe(true);
  expect(calendarEventsResponseContract.safeParse({
    ...response,
    events: [{
      ...event,
      allDay: true,
      timeKind: "date",
      time: { kind: "date", startDate: "2026-10-22", endDate: "2026-10-22" },
    }],
  }).success).toBe(true);
  expect(calendarHistoryResponseContract.safeParse({
    ...response,
    windowStart: "2026-10-01T00:00:00.000Z",
    windowEnd: "2026-11-01T00:00:00.000Z",
    nextCursor: null,
  }).success).toBe(true);
});

it("rejects malformed projected times, dates, freshness, and History windows", () => {
  for (const invalid of [
    { ...event, start: "tomorrow" },
    { ...event, time: { ...event.time, end: "noon" } },
    { ...event, freshness: { state: "fresh", asOf: "recently" } },
    { ...event, allDay: true, timeKind: "date", time: { kind: "date", startDate: "2026-13-22", endDate: "2026-10-22" } },
  ]) {
    expect(calendarEventsResponseContract.safeParse({ ...response, events: [invalid] }).success).toBe(false);
  }
  expect(calendarHistoryResponseContract.safeParse({
    ...response,
    windowStart: "last-month",
    windowEnd: "2026-11-01T00:00:00.000Z",
    nextCursor: null,
  }).success).toBe(false);
});
