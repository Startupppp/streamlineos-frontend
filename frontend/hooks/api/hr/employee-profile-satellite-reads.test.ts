import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Ticket 02. `/hr/employees/[employeeId]` showed "Failed to load employee
 * details. Try again." while the employee's own record had loaded fine. The
 * page was being replaced by its route error boundary because one of the
 * satellite reads around it — availability, stats, projects, tickets, direct
 * reports, the manager scorecard, the timeline — failed, and a read error
 * reaches the boundary by default.
 *
 * Every one of those consumers already draws the absence or its own inline
 * failure with a retry, so none of them may take the profile down. This pins
 * that: the failure belongs to the card, not to the route.
 */
const SATELLITE_READS: readonly [file: string, hook: string][] = [
  ["employee-insights.ts", "useHrEmployeeStats"],
  ["employee-insights.ts", "useHrEmployeeProjects"],
  ["employee-insights.ts", "useHrEmployeeTickets"],
  ["employee-insights.ts", "useEmployeeAvailability"],
  ["employee-insights.ts", "useDirectReports"],
  ["employee-insights.ts", "useManagerScorecard"],
  ["employee-profile.ts", "useEmployeeTimeline"],
];

function hookBody(file: string, hook: string): string {
  const source = readFileSync(join(__dirname, file), "utf8");
  const start = source.indexOf(`export function ${hook}(`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf("\nexport function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

it.each(SATELLITE_READS)(
  "%s: %s keeps its failure inline instead of replacing the employee profile",
  (file, hook) => {
    expect(hookBody(file, hook)).toContain("...INLINE_READ_ERROR");
  },
);

it("still lets the employee's own record fail the route, because that is the real failure", () => {
  const route = readFileSync(
    join(
      process.cwd(),
      "app",
      "(authenticated)",
      "hr",
      "employees",
      "[employeeId]",
      "page.tsx",
    ),
    "utf8",
  );

  // The record read is awaited in the route and its failure draws the
  // recoverable error, rather than being swallowed into an empty profile.
  expect(route).toContain("EmployeeDetailLoadError");
  expect(route).toContain("return notFound()");
});
