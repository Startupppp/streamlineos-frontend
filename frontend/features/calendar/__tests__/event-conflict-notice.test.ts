import * as fs from "fs";
import * as path from "path";
import { format, parseISO } from "date-fns";
import { backendPath } from "@/test-utils/backend-repo";
import { describeEventConflicts, eventConflictViewUrl } from "../event-conflict-notice";


const FE_ROOT = path.join(__dirname, "..", "..", "..");
const SCANNED_DIRS = ["app", "components", "features", "hooks", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next"]);
const CONFLICT_FIELDS = ["eventConflicts", "oooConflicts"] as const;

const BACKEND_SERVICE = backendPath("src", "modules", "calendar", "calendar.service.ts");

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    out.push(path.join(dir, entry.name));
  }
}

function consumersOf(field: string): string[] {
  const files: string[] = [];
  for (const dir of SCANNED_DIRS) walk(path.join(FE_ROOT, dir), files);
  return files
    .filter((file) => fs.readFileSync(file, "utf8").includes(field))
    .map((file) => path.relative(FE_ROOT, file))
    .filter(
      (rel) =>
        rel !== path.join("hooks", "api", "calendar.ts") &&
        !rel.includes("__tests__"),
    );
}

describe("calendar create conflicts — the server's work is not discarded", () => {
  it("the backend still returns both conflict lists from createEvent", () => {
    const source = fs.readFileSync(BACKEND_SERVICE, "utf8");
    expect(source).toMatch(/return\s*\{\s*event,\s*oooConflicts,\s*eventConflicts,\s*meetingUrl:\s*null,\s*syncQueued:/);
  });

  it("the client response type declares every conflict field the server sends", () => {
    const hooks = fs.readFileSync(
      path.join(FE_ROOT, "hooks", "api", "calendar-mutations.ts"),
      "utf8",
    );
    const block = /interface MutateCalendarEventResponse \{([\s\S]*?)\n\}/.exec(hooks);
    expect(block).not.toBeNull();
    for (const field of CONFLICT_FIELDS) {
      expect(block?.[1]).toContain(`${field}:`);
    }
  });

  it("each conflict field has a consumer outside its own declaration", () => {
    for (const field of CONFLICT_FIELDS) {
      expect(consumersOf(field)).not.toEqual([]);
    }
  });
});

describe("describeEventConflicts", () => {
  it("returns null when nothing conflicts", () => {
    expect(describeEventConflicts({ eventConflicts: [], oooConflicts: [] })).toBeNull();
    expect(describeEventConflicts({})).toBeNull();
  });

  it("names the overlapping events, up to the 2-item cap", () => {
    expect(
      describeEventConflicts({ eventConflicts: [{ eventId: 1, title: "Standup" }] }),
    ).toBe(`it clashes with "Standup"`);
    expect(
      describeEventConflicts({
        eventConflicts: [
          { eventId: 1, title: "Standup" },
          { eventId: 2, title: "Retro" },
        ],
      }),
    ).toBe(`it clashes with "Standup", "Retro"`);
    expect(
      describeEventConflicts({
        eventConflicts: [
          { eventId: 1, title: "Standup" },
          { eventId: 2, title: "Retro" },
          { eventId: 3, title: "1:1" },
        ],
      }),
    ).toBe(`it clashes with "Standup", "Retro" and 1 other`);
  });

  it("CAL-B-005 says when each named clash happens", () => {
    const start = "2026-10-21T10:00:00.000Z";
    expect(
      describeEventConflicts({
        eventConflicts: [
          { eventId: 1, title: "TZ probe", startDate: start, allDay: false },
          { eventId: 2, title: "Offsite", startDate: "2026-10-21T00:00:00.000Z", allDay: true },
        ],
      }),
    ).toBe(`it clashes with "TZ probe" at ${format(parseISO(start), "h:mm a")}, "Offsite" (all day)`);
  });

  it("falls back to a count when every conflicting event has no title", () => {
    expect(
      describeEventConflicts({ eventConflicts: [{ eventId: 1, title: "" }, { eventId: 2, title: "  " }] }),
    ).toBe("it clashes with 2 events already on your calendar");
  });

  it("names one attendee on approved leave", () => {
    expect(
      describeEventConflicts({
        oooConflicts: [
          { userId: "u1", userName: "Ada Lovelace", leaveStart: "2026-01-05", leaveEnd: "2026-01-09" },
        ],
      }),
    ).toBe("Ada Lovelace is on approved leave");
  });

  it("names two attendees, and summarises beyond that", () => {
    const leave = (userId: string, userName: string) => ({
      userId,
      userName,
      leaveStart: "2026-01-05",
      leaveEnd: "2026-01-09",
    });
    expect(
      describeEventConflicts({ oooConflicts: [leave("u1", "Ada"), leave("u2", "Grace")] }),
    ).toBe("Ada and Grace are on approved leave");
    expect(
      describeEventConflicts({
        oooConflicts: [leave("u1", "Ada"), leave("u2", "Grace"), leave("u3", "Alan")],
      }),
    ).toBe("Ada, Grace and 1 other are on approved leave");
  });

  it("counts rather than printing an id when the name is missing", () => {
    expect(
      describeEventConflicts({
        oooConflicts: [
          { userId: "5f1c…", userName: null, leaveStart: "2026-01-05", leaveEnd: "2026-01-09" },
        ],
      }),
    ).toBe("1 attendee is on approved leave");
    expect(
      describeEventConflicts({
        oooConflicts: [
          { userId: "a", userName: null, leaveStart: "2026-01-05", leaveEnd: "2026-01-09" },
          { userId: "b", userName: "   ", leaveStart: "2026-01-05", leaveEnd: "2026-01-09" },
        ],
      }),
    ).toBe("2 attendees are on approved leave");
  });

  it("counts one person once even when they hold two overlapping leaves", () => {
    const leave = (leaveStart: string) => ({
      userId: "u1",
      userName: "Ada",
      leaveStart,
      leaveEnd: "2026-01-09",
    });
    expect(
      describeEventConflicts({ oooConflicts: [leave("2026-01-05"), leave("2026-01-06")] }),
    ).toBe("Ada is on approved leave");
  });

  it("reports both kinds together", () => {
    expect(
      describeEventConflicts({
        eventConflicts: [{ eventId: 9, title: "1:1" }],
        oooConflicts: [
          { userId: "u1", userName: "Ada", leaveStart: "2026-01-05", leaveEnd: "2026-01-09" },
        ],
      }),
    ).toBe(`it clashes with "1:1", and Ada is on approved leave`);
  });
});

describe("UX: the clash toast can jump to the clashing event's day", () => {
  const conflict = {
    eventId: 4,
    title: "Standup",
    startDate: "2026-10-21T09:00:00.000Z",
    endDate: "2026-10-21T09:15:00.000Z",
    nominalStart: "2026-10-21T09:00:00.000Z",
    allDay: false,
    timezone: "UTC",
    orgId: "org-1",
  };

  it("opens the day view on the first clash and keeps the other params", () => {
    const url = eventConflictViewUrl({ eventConflicts: [conflict] }, "?hr=0&event=event-9");
    expect(url).toMatch(/^\/calendar\?/);
    const params = new URLSearchParams(url?.split("?")[1]);
    expect(params.get("view")).toBe("day");
    expect(params.get("mode")).toBe("calendar");
    expect(params.get("date")).toMatch(/^2026-10-2[01]$/);
    expect(params.get("hr")).toBe("0");
    expect(params.has("event")).toBe(false);
  });

  it("offers no jump when nothing clashes", () => {
    expect(eventConflictViewUrl({ eventConflicts: [] }, "")).toBeNull();
  });
});
