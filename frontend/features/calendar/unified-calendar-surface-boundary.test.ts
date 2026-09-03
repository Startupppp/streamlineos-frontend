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
