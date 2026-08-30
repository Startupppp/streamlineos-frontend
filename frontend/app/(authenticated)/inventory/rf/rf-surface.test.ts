import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * NEO-5 - the RF surface stays one-handed.
 *
 * The unit's whole claim is that a picker can walk a wave line without a data
 * table, and a table is exactly what gets added the first time somebody wants to
 * "show a bit more context". So the claim is a check rather than a note.
 *
 * It reads the route files and the components they own, and fails when any of
 * them reaches for a table, a horizontal scroll container, or the desktop wave
 * screen's own components. Passing does not make the screen good on a handheld -
 * only that it has not quietly become the desktop one again.
 */

const RF_ROUTE_DIR = join(__dirname);
const RF_COMPONENT_DIR = join(__dirname, "..", "..", "..", "..", "features", "inventory", "components", "rf");

/** Anything that means "this is a desktop layout". */
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
    // The capture is the fact that a person stood in front of a shelf and read a
    // label, and it has to survive a command that fails. A runner that confirms
    // without capturing loses the evidence for exactly the confirmations worth
    // investigating - so the order is asserted, not merely the presence.
    const runners = sourceFiles(RF_ROUTE_DIR).filter(
      (path) => /\/(pick|putaway)\//.test(path) && path.endsWith("page.tsx"),
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

  it("answers denied, offline and queued as three distinct things", () => {
    // A device can be online with a backlog, and offline with nothing
    // outstanding. Collapsing the two is how an operator ends a shift believing
    // work landed.
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
