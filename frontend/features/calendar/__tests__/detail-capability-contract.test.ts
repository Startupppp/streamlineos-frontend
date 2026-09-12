import * as fs from "fs";
import { backendPath } from "@/test-utils/backend-repo";
import { calendarEventDetailContract } from "@/hooks/api/calendar-schema";

const BACKEND_SCHEMA = backendPath(
  "src",
  "modules",
  "calendar",
  "dto",
  "calendar-response.schemas.ts",
);
const BACKEND_DETAIL_SERVICE = backendPath(
  "src",
  "modules",
  "calendar",
  "calendar-event-detail.service.ts",
);

const wirePayload = {
  id: 1,
  title: "Team sync",
  startDate: "2026-09-12T10:00:00Z",
  endDate: "2026-09-12T11:00:00Z",
  allDay: false,
  timezone: "UTC",
  color: "blue",
  category: "meeting",
  entityType: null,
  entityId: null,
  location: null,
  meetingUrl: null,
  description: null,
  creatorName: "Ada Creator",
  myRsvpStatus: null,
  linkedTicket: null,
  rrule: null,
  isRecurring: false,
  canManage: true,
};

describe("calendar detail capability survives the response contract", () => {
  it("does not strip canManage out of the parsed detail", () => {
    const parsed = calendarEventDetailContract.safeParse(wirePayload);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.canManage).toBe(true);
  });

  it("carries a false capability through as false, not as undefined", () => {
    const parsed = calendarEventDetailContract.safeParse({ ...wirePayload, canManage: false });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.canManage).toBe(false);
  });

  it("rejects a detail response that omits the capability (anti-vacuity)", () => {
    const { canManage: _omitted, ...withoutCapability } = wirePayload;
    const parsed = calendarEventDetailContract.safeParse(withoutCapability);

    expect(parsed.success).toBe(false);
  });

  it("the backend detail schema declares canManage, so the field is really on the wire", () => {
    const source = fs.readFileSync(BACKEND_SCHEMA, "utf8");
    const block = /export const calendarEventDetailSchema = z\.object\(\{([\s\S]*?)\n\}\);/.exec(source);

    expect(block).not.toBeNull();
    expect(block?.[1] ?? "").toMatch(/^ {2}canManage: z\.boolean\(\),$/m);
  });

  it("the backend detail service derives the capability from the creating membership", () => {
    const source = fs.readFileSync(BACKEND_DETAIL_SERVICE, "utf8");

    expect(source).toMatch(/canManage:[^\n]*createdByMembershipId/);
    expect(source).toMatch(/canManage:[^\n]*callerMembershipId > 0/);
  });
});
