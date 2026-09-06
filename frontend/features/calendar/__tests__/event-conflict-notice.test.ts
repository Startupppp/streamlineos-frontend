import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";
import { describeEventConflicts } from "../event-conflict-notice";

/**
 * The conflicts the server computes reach the person who caused them.
 *
 * `createEvent` returns `{ event, oooConflicts, eventConflicts, meetingUrl,
 * syncQueued }` (calendar.service.ts). `eventConflicts` was absent from the
 * client response type entirely and `oooConflicts` was declared and never read:
 * a grep of the whole frontend for either name returned the type declaration and
 * nothing else. So the server ran a paged scan for overlapping occurrences and a
 * leave join on every single create, and the UI answered "Event created".
 * Double-booking yourself and inviting someone on approved leave both looked
 * exactly like success.
 *
 * WHY THIS IS A TOAST AND NOT A CONFIRM-ANYWAY STEP. The conflicts arrive WITH
 * the created event — `checkConflictsInTx` runs inside the same transaction as
 * the insert, and `CalendarConflictService.checkConflicts` has no route on
 * `calendar.controller.ts`. There is no way to ask "would this clash?" before
 * committing, so a step that blocks the dialog until the user confirms would
 * need a new pre-flight endpoint. That is a feature; this is the defect fix, and
 * it uses the warning-toast treatment already established for `syncError`.
 *
 * ANTI-VACUITY. The consumer scan carries a floor, and it deliberately excludes
 * this test file: a gate that counted its own assertions as consumers would go
 * green on a frontend that still discards both lists.
 */

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

/** Files mentioning a field, excluding the hook that declares it and this test. */
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
    // Anti-vacuity: if this return statement is reshaped, the whole premise
    // changes and this suite must be revisited rather than quietly pass.
    expect(source).toContain(
      "return { event, oooConflicts, eventConflicts, meetingUrl: null, syncQueued:",
    );
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

  it("counts overlapping events, singular and plural", () => {
    expect(
      describeEventConflicts({ eventConflicts: [{ eventId: 1, title: "Standup" }] }),
    ).toBe("it clashes with 1 event already on your calendar");
    expect(
      describeEventConflicts({
        eventConflicts: [
          { eventId: 1, title: "Standup" },
          { eventId: 2, title: "Retro" },
        ],
      }),
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
    // A visible user id is a defect (frontend CLAUDE.md §5), so an unnamed
    // attendee is counted, never identified.
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
    ).toBe("it clashes with 1 event already on your calendar, and Ada is on approved leave");
  });
});
