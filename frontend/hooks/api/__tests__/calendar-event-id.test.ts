import * as fs from "fs";
import { backendPath } from "@/test-utils/backend-repo";
import {
  extractEventNumericId,
  parseCalendarEventId,
} from "@/hooks/api/calendar";

/**
 * A recurring occurrence's id is parsable, and it carries its nominal start.
 *
 * The native source emits an occurrence as `event-<id>-<ISO instant>`
 * (calendar-native-event-source.ts). `extractEventNumericId` was
 * `id.match(/(\d+)$/)` — an ISO instant ends in `Z`, so every recurring
 * occurrence parsed to `null`. Delete, "Cancel occurrence", RSVP and Unlink all
 * open `if (numericEventId === null) return;`, so opening a weekly stand-up and
 * confirming a destructive dialog issued no request, showed no error and no
 * toast. `useEventAttendees` stayed disabled, `EventSyncStatus` rendered
 * nothing, and the series-scope confirm reported "Cannot edit this event type".
 * No fixture in this repository was ever recurring-shaped: every one is
 * `event-42`.
 *
 * The trailing-digits form was also loose in the other direction — it read a
 * number off `attendance-absence-2026-01-05` and off `ext-3-abc123`, ids from
 * other sources entirely. Every call site happens to guard on
 * `source === "event"` today, so that was latent rather than live; parsing by
 * structure removes it rather than relying on four guards staying correct.
 *
 * `occurrenceStart` is not `event.start`. For a RESCHEDULED occurrence the
 * projection carries the NOMINAL instant in the id and the moved time in
 * `start` (calendar-native-event-source.ts, the `collectRescheduledOccurrences`
 * branch), while `calendar_event_exceptions` is keyed on the nominal one — so
 * keying an exception off `start` would write a second row instead of updating
 * the existing one.
 *
 * The id shapes are read out of the backend source rather than copied, with a
 * floor, so a change to either format fails here instead of silently at runtime.
 */

const MEASURED_ID_TEMPLATE_FLOOR = 3;

const BACKEND_NATIVE_SOURCE = backendPath(
  "src",
  "modules",
  "calendar",
  "calendar-native-event-source.ts",
);

function backendIdTemplates(): string[] {
  const source = fs.readFileSync(BACKEND_NATIVE_SOURCE, "utf8");
  const templates: string[] = [];
  for (const match of source.matchAll(/id:[^`\n]*`([^`]+)`/g)) {
    const template = match[1];
    if (template !== undefined) templates.push(template);
  }
  // The ternary at the projection carries two templates on one line.
  for (const match of source.matchAll(/`(event-[^`]+)`/g)) {
    const template = match[1];
    if (template !== undefined && !templates.includes(template))
      templates.push(template);
  }
  return templates;
}

describe("calendar event ids — the shapes the backend actually emits", () => {
  it("still emits a bare form and an occurrence form suffixed with an ISO instant", () => {
    const templates = backendIdTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(MEASURED_ID_TEMPLATE_FLOOR);

    expect(templates).toContain("event-${event.id}");
    expect(
      templates.some((t) => t.startsWith("event-${event.id}-") && t.includes("toISOString()")),
    ).toBe(true);
  });
});

describe("parseCalendarEventId", () => {
  it("parses a non-recurring event id", () => {
    expect(parseCalendarEventId("event-42")).toEqual({
      eventId: 42,
      occurrenceStart: null,
    });
  });

  it("parses a recurring occurrence id and keeps its nominal instant", () => {
    expect(parseCalendarEventId("event-42-2026-01-05T10:00:00.000Z")).toEqual({
      eventId: 42,
      occurrenceStart: "2026-01-05T10:00:00.000Z",
    });
  });

  it("parses a single-digit id with an occurrence suffix", () => {
    expect(parseCalendarEventId("event-1-2026-09-07T09:00:00.000Z")).toEqual({
      eventId: 1,
      occurrenceStart: "2026-09-07T09:00:00.000Z",
    });
  });

  it("returns null for ids belonging to another calendar source", () => {
    for (const id of [
      "leave-9",
      "interview-3",
      "task-7",
      "holiday-11",
      "attendance-4",
      "attendance-wfh-4",
      "attendance-absence-2026-01-05",
      "ext-3-abc123",
    ]) {
      expect(parseCalendarEventId(id)).toBeNull();
    }
  });

  it("returns null for a malformed event id", () => {
    for (const id of ["event-", "event-abc", "event", "", "eventual-4"]) {
      expect(parseCalendarEventId(id)).toBeNull();
    }
  });
});

describe("extractEventNumericId", () => {
  it("still answers the non-recurring case", () => {
    expect(extractEventNumericId("event-42")).toBe(42);
  });

  it("answers the recurring occurrence case instead of null", () => {
    expect(extractEventNumericId("event-42-2026-01-05T10:00:00.000Z")).toBe(42);
  });

  it("no longer reads a number off another source's id", () => {
    // `attendance-absence-2026-01-05` used to yield 5 and `ext-3-abc123` 123.
    expect(extractEventNumericId("attendance-absence-2026-01-05")).toBeNull();
    expect(extractEventNumericId("ext-3-abc123")).toBeNull();
    expect(extractEventNumericId("leave-9")).toBeNull();
  });
});
