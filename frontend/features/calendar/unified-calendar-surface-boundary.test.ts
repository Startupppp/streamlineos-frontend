import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Root CLAUDE.md §8 — "One unified calendar. Never module-specific calendar
 * pages" — and §9's one-directional flow (features -> shared, never
 * feature -> feature).
 *
 * `/hr/recruitment/interviews` broke both for five consecutive audit passes by
 * importing `BigCalendarWrapper` out of `features/calendar/**`. This scan is
 * the regression fence: nothing outside `features/calendar/**` may mount the
 * calendar grid, by any route in.
 */

const FEATURES_DIR = join(__dirname, "..");
const CALENDAR_DIR = join(FEATURES_DIR, "calendar");

const CALENDAR_SURFACE_RE =
  /from\s+["'](?:@\/features\/calendar|\.\.\/calendar|react-big-calendar)[^"']*["']|import\(\s*["'](?:@\/features\/calendar|\.\.\/calendar|react-big-calendar)[^"']*["']/;

function collectSourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full === CALENDAR_DIR) continue;
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    found.push(full);
  }
  return found;
}

describe("unified calendar surface boundary", () => {
  it("the scan detects the import it exists to ban, so a green result is meaningful", () => {
    const knownBad = [
      `import { BigCalendarWrapper } from "@/features/calendar/big-calendar-wrapper";`,
      `const C = dynamic(() => import("@/features/calendar/big-calendar-wrapper"));`,
      `import type { View } from "../calendar/big-calendar-wrapper";`,
      `import { Calendar } from "react-big-calendar";`,
    ];

    for (const line of knownBad) expect(CALENDAR_SURFACE_RE.test(line)).toBe(true);
  });

  it("the scan does not fire on an unrelated import", () => {
    const benign = [
      `import { useHrCalendar } from "@/hooks/api/hr/hr-calendar";`,
      `import { CalendarDays } from "lucide-react";`,
      `import { format } from "date-fns";`,
    ];

    for (const line of benign) expect(CALENDAR_SURFACE_RE.test(line)).toBe(false);
  });

  it("no feature outside features/calendar imports the calendar surface", () => {
    const offenders = collectSourceFiles(FEATURES_DIR)
      .filter((file) => CALENDAR_SURFACE_RE.test(readFileSync(file, "utf8")))
      .map((file) => relative(FEATURES_DIR, file).split(sep).join("/"));

    expect(offenders).toEqual([]);
  });
});

/**
 * The import scan above is necessary but NOT sufficient: it only catches a
 * module that mounts OUR grid. A module that hand-rolls its own day grid out of
 * `date-fns` and `grid-cols-7` imports nothing from `features/calendar/**` and
 * sails straight through — which is exactly the shape of every surface still
 * outstanding. This second scan closes that hole.
 *
 * The three below are recorded, not silently tolerated: each duplicates an
 * aggregate source that `/calendar` already serves. Removing one is a product
 * decision (the Build grid is per-project, which `/calendar` cannot express
 * today), so this list is the handover, and `toEqual` makes it bite in BOTH
 * directions — a new surface fails, and so does a fixed one until its entry is
 * deleted here.
 */
const DAY_GRID_RE = /grid-cols-7/;
const CALENDAR_DAY_SIGNAL_RE =
  /eachDayOfInterval|startOfMonth|endOfMonth|startOfWeek|getDaysInMonth|daysInMonth|"Sun"|'Sun'|WEEKDAYS/;

const KNOWN_MODULE_CALENDAR_SURFACES = [
  // Month grid of tickets by dueDate, with prev/next/today and month+year
  // selects. Duplicates the registered `build` source. Owner: Build.
  "build/views/calendar-view.tsx",
  // Month grid of holidays with prev/next; the holidays page's DEFAULT view.
  // Duplicates the registered `hr-holidays` source. Owner: HR / ticket 25.
  "hr/holidays/components/calendar-view.tsx",
  // "Who's Out This Week" seven-day avatar strip. Read-only, no navigation and
  // no view switch, so it reads as a dashboard widget rather than a calendar
  // page; recorded here so the judgement is visible rather than assumed.
  "hr/leaves/components/leave-calendar-widget.tsx",
];

describe("no module hand-rolls its own calendar grid", () => {
  it("the scan detects a hand-rolled day grid, so a green result is meaningful", () => {
    const knownBad = [
      `<div className="grid grid-cols-7 gap-1">{eachDayOfInterval({ start, end }).map(...)}</div>`,
      `const days = startOfMonth(viewDate); return <div className="grid grid-cols-7">…`,
    ];

    for (const src of knownBad)
      expect(DAY_GRID_RE.test(src) && CALENDAR_DAY_SIGNAL_RE.test(src)).toBe(true);
  });

  it("the scan does not fire on a seven-column grid that is not a calendar", () => {
    const benign = [
      `<div className="grid grid-cols-7 gap-2 text-xs font-semibold">{agingBuckets.map(...)}</div>`,
      `<div className="grid grid-cols-1 gap-4 lg:grid-cols-7">{widgets}</div>`,
      `const start = startOfMonth(now); const end = endOfMonth(now); // a date-range filter`,
    ];

    for (const src of benign)
      expect(DAY_GRID_RE.test(src) && CALENDAR_DAY_SIGNAL_RE.test(src)).toBe(false);
  });

  it("the outstanding module calendar surfaces are exactly the ones on record", () => {
    const found = collectSourceFiles(FEATURES_DIR)
      .filter((file) => {
        const src = readFileSync(file, "utf8");
        return DAY_GRID_RE.test(src) && CALENDAR_DAY_SIGNAL_RE.test(src);
      })
      .map((file) => relative(FEATURES_DIR, file).split(sep).join("/"))
      .sort();

    expect(found).toEqual([...KNOWN_MODULE_CALENDAR_SURFACES].sort());
  });
});
