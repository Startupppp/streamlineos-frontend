import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";

/**
 * PRD-C047 / PRD-C049 — `CalendarEvent` names only fields the server projects.
 *
 * The interface used to declare five fields no route has ever sent: `createdBy`,
 * `attendeeIds`, `isRecurring`, `recurringRule` and `creator`. `calendar_events` has
 * no `is_recurring` column at all, the recurrence rule is `rrule`, the creator column
 * is `created_by_membership_id` (a membership id, deliberately withheld), and
 * attendees live in their own table behind `GET /calendar/events/:id/attendees`.
 * Every one typechecked forever and was `undefined` at runtime forever — the exact
 * "parallel hand-written types that drift from schemas" PRD-C047 forbids.
 *
 * The comparison is against the backend's `calendarEventWireColumns` object, not a
 * copy of it, so re-adding a phantom field on either side alone fails here. It is a
 * source read rather than a type import because the two repos do not share a
 * TypeScript project.
 */
const FE_ROOT = path.join(__dirname, "..", "..", "..");
const HOOKS = path.join(FE_ROOT, "hooks", "api", "calendar-mutations.ts");
const BACKEND_SERVICE = backendPath("src", "modules", "calendar", "calendar-event-wire.ts");

/** The keys of `calendarEventWireColumns` in the backend wire module. */
function backendWireFields(): string[] {
  const source = fs.readFileSync(BACKEND_SERVICE, "utf8");
  const block = /const calendarEventWireColumns = \{([\s\S]*?)\n\};/.exec(source);
  // Anti-vacuity: a renamed or deleted projection means the premise changed and must
  // be revisited, not quietly satisfied by a regex that stopped matching.
  expect(block).not.toBeNull();
  const fields = [...(block?.[1] ?? "").matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map((m) => m[1] ?? "");
  expect(fields.length).toBeGreaterThan(10);
  return fields;
}

/** The fields declared on the frontend `CalendarEvent` interface. */
function clientFields(): string[] {
  const source = fs.readFileSync(HOOKS, "utf8");
  const block = /interface CalendarEvent \{([\s\S]*?)\n\}/.exec(source);
  expect(block).not.toBeNull();
  const fields = (block?.[1] ?? "")
    .split("\n")
    .map((line) => /^\s*([A-Za-z][A-Za-z0-9]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
  expect(fields.length).toBeGreaterThan(10);
  return fields;
}

describe("calendar mutate-event projection contract", () => {
  it("declares no field the backend projection does not carry", () => {
    const server = new Set(backendWireFields());
    for (const field of clientFields()) expect([field, server.has(field)]).toEqual([field, true]);
  });

  it("declares every field the backend projection carries", () => {
    const client = new Set(clientFields());
    for (const field of backendWireFields()) expect([field, client.has(field)]).toEqual([field, true]);
  });

  it("names none of the five fields that never existed", () => {
    const client = clientFields();
    for (const phantom of ["createdBy", "attendeeIds", "isRecurring", "recurringRule", "creator"])
      expect(client).not.toContain(phantom);
  });

  it("the withheld internal columns stay off the client type", () => {
    const client = clientFields();
    for (const withheld of [
      "createdByMembershipId",
      "reminder15MinSent",
      "integrationConnectionId",
      "externalEventId",
      "agenda",
      "postMeetingNotes",
      "visibility",
      "linkedDealId",
      "linkedLeadId",
    ])
      expect(client).not.toContain(withheld);
  });
});
