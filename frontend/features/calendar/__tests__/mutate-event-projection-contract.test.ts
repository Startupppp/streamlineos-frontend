import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";

const FE_ROOT = path.join(__dirname, "..", "..", "..");
const HOOKS = path.join(FE_ROOT, "hooks", "api", "calendar-mutations.ts");
const BACKEND_SERVICE = backendPath("src", "modules", "calendar", "calendar-event-wire.ts");

function backendWireFields(): string[] {
  const source = fs.readFileSync(BACKEND_SERVICE, "utf8");
  const block = /const calendarEventWireColumns = \{([\s\S]*?)\n\};/.exec(source);
  expect(block).not.toBeNull();
  const fields = [...(block?.[1] ?? "").matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map((m) => m[1] ?? "");
  expect(fields.length).toBeGreaterThan(10);
  return fields;
}

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
