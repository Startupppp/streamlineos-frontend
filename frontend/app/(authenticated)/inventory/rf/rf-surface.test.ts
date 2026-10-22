import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";


const RF_ROUTE_DIR = join(__dirname);
const RF_COMPONENT_DIR = join(__dirname, "..", "..", "..", "..", "features", "inventory", "components", "rf");

const DESKTOP_SHAPES = [
  /\bDataTable\b/,
  /\bDataTableSkeleton\b/,
  /<table\b/,
  /overflow-x-auto/,
];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

describe("NEO-5 - the RF shell is not a desktop screen", () => {
  it("finds the RF surface at all, so a broken walk cannot pass silently", () => {
    expect(sourceFiles(RF_ROUTE_DIR).length).toBeGreaterThan(2);
    expect(sourceFiles(RF_COMPONENT_DIR).length).toBeGreaterThan(1);
  });

  it("renders no data table anywhere in the RF surface", () => {
    const offenders: string[] = [];
    for (const path of [...sourceFiles(RF_ROUTE_DIR), ...sourceFiles(RF_COMPONENT_DIR)]) {
      const source = readFileSync(path, "utf8");
      if (DESKTOP_SHAPES.some((shape) => shape.test(source))) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it("captures a scan before the command on every RF task runner", () => {
    const runners = sourceFiles(RF_ROUTE_DIR).filter((path) =>
      /[/\\](pick|putaway)[/\\]\[[^\\/\]]+\][/\\]page\.tsx$/.test(path),
    );
    expect(runners).toHaveLength(2);

    for (const path of runners) {
      const source = readFileSync(path, "utf8");
      const captureAt = source.indexOf("capture.mutateAsync");
      const commandAt = Math.min(
        ...["confirm.mutateAsync", "complete.mutateAsync"]
          .map((call) => source.indexOf(call))
          .filter((index) => index >= 0),
      );

      expect(captureAt).toBeGreaterThan(-1);
      expect(Number.isFinite(commandAt)).toBe(true);
      expect(captureAt).toBeLessThan(commandAt);
    }
  });

  it("keeps the per-kind queues listing work rather than confirming it", () => {
    for (const kind of ["pick", "putaway"]) {
      const path = join(RF_ROUTE_DIR, kind, "page.tsx");
      expect(existsSync(path)).toBe(true);

      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("mutateAsync");
      expect(source).toContain("NoPermissionState");
    }
  });

  it("answers denied, offline and queued as three distinct things", () => {
    const shell = readFileSync(join(RF_COMPONENT_DIR, "rf-shell.tsx"), "utf8");
    expect(shell).toContain("Offline");
    expect(shell).toContain("queued");
    expect(shell).toContain("need attention");

    for (const path of sourceFiles(RF_ROUTE_DIR)) {
      if (!path.endsWith("page.tsx")) continue;
      expect(readFileSync(path, "utf8")).toContain("NoPermissionState");
    }
  });
});
