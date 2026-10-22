import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  expect(route).toContain("EmployeeDetailLoadError");
  expect(route).toContain("return notFound()");
});
