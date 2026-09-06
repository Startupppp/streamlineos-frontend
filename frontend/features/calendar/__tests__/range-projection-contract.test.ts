import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";

const FE_ROOT = path.join(__dirname, "..", "..", "..");
const HOOKS = path.join(FE_ROOT, "hooks", "api", "calendar.ts");
const BACKEND_SCHEMA = backendPath(
  "src",
  "modules",
  "calendar",
  "dto",
  "calendar-response.schemas.ts",
);

function readFile(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function interfaceFields(source: string, name: string): string[] {
  const re = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`);
  const block = re.exec(source);
  expect(block).not.toBeNull();
  return (block?.[1] ?? "")
    .split("\n")
    .map((line) => /^  ([A-Za-z][A-Za-z0-9]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
}

function schemaFields(source: string, name: string): string[] {
  const startRe = new RegExp(`export const ${name} = z\\.object\\(\\{`);
  const start = startRe.exec(source);
  expect(start).not.toBeNull();
  const afterStart = source.slice((start?.index ?? 0) + (start?.[0].length ?? 0));
  const closeMatch = /^\}\);/m.exec(afterStart);
  const block = closeMatch ? afterStart.slice(0, closeMatch.index) : afterStart;
  return [...block.matchAll(/^  ([A-Za-z][A-Za-z0-9]*):/gm)]
    .map((m) => m[1] ?? "")
    .filter((f) => f.length > 0);
}

describe("range projection contract — CalendarListItem vs calendarEventItemSchema", () => {
  const beSource = readFile(BACKEND_SCHEMA);
  const feSource = readFile(HOOKS);

  const backendItemFields = schemaFields(beSource, "calendarEventItemSchema");
  const frontendListFields = interfaceFields(feSource, "CalendarListItem");

  it("backend schema has fields to compare against (anti-vacuity)", () => {
    expect(backendItemFields.length).toBeGreaterThan(5);
  });

  it("CalendarListItem declares no field calendarEventItemSchema does not carry", () => {
    const server = new Set(backendItemFields);
    for (const field of frontendListFields)
      expect([field, server.has(field)]).toEqual([field, true]);
  });

  it("the four detail-only fields are absent from CalendarListItem", () => {
    for (const dropped of ["rrule", "isRecurring", "meetingUrl", "linkedTicket"])
      expect(frontendListFields).not.toContain(dropped);
  });

  it("the four detail-only fields are absent from calendarEventItemSchema", () => {
    for (const dropped of ["rrule", "isRecurring", "meetingUrl", "linkedTicket"])
      expect(backendItemFields).not.toContain(dropped);
  });
});

describe("detail contract — CalendarEventDetail vs calendarEventDetailSchema", () => {
  const beSource = readFile(BACKEND_SCHEMA);
  const feSource = readFile(HOOKS);

  const backendDetailFields = schemaFields(beSource, "calendarEventDetailSchema");
  const frontendDetailFields = interfaceFields(feSource, "CalendarEventDetail");

  it("backend detail schema has fields to compare against (anti-vacuity)", () => {
    expect(backendDetailFields.length).toBeGreaterThan(8);
  });

  it("CalendarEventDetail declares no field calendarEventDetailSchema does not carry", () => {
    const server = new Set(backendDetailFields);
    for (const field of frontendDetailFields)
      expect([field, server.has(field)]).toEqual([field, true]);
  });

  it("CalendarEventDetail carries all fields calendarEventDetailSchema declares", () => {
    const client = new Set(frontendDetailFields);
    for (const field of backendDetailFields)
      expect([field, client.has(field)]).toEqual([field, true]);
  });

  it("the four stripped fields appear in CalendarEventDetail and not in CalendarListItem", () => {
    const listFields = interfaceFields(feSource, "CalendarListItem");
    for (const field of ["rrule", "isRecurring", "meetingUrl", "linkedTicket"]) {
      expect(frontendDetailFields).toContain(field);
      expect(listFields).not.toContain(field);
    }
  });
});
