import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCANNED = ["app", "features", "components"];
const SKIPPED = new Set(["node_modules", ".next", ".next-e2e", "__snapshots__"]);

const KILLED_HREFS = [
  "/hr/service-delivery",
  "/hr/reimbursements",
  "/hr/simulator",
  "/hr/settings/company",
] as const;

const ALLOWED_OWNERS = [
  "components/layout/sidebar/hr-week-one-nav.ts",
  "components/layout/sidebar/sidebar-nav-routes-hr-employee-experience.ts",
  "components/layout/sidebar/sidebar-nav-routes-hr-settings.ts",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue;
    out.push(path);
  }
  return out;
}

function linksTo(source: string, href: string): boolean {
  return source.includes(`href="${href}"`) || source.includes(`href={"${href}"}`);
}

describe("the killed HR chrome has no customer-facing link", () => {
  const files = SCANNED.flatMap((dir) => walk(join(ROOT, dir)));

  it.each(KILLED_HREFS)("nothing links to %s", (href) => {
    const offenders = files
      .filter((file) => linksTo(readFileSync(file, "utf8"), href))
      .map((file) => relative(ROOT, file))
      .filter((file) => !ALLOWED_OWNERS.includes(file));

    expect(offenders).toEqual([]);
  });

  it("scans a corpus large enough to be meaningful", () => {
    expect(files.length).toBeGreaterThan(500);
  });
});
