import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const APP_ROOT = join(__dirname, "..", "..", "..");

const SCANNED = ["app", "components", "features", "hooks", "lib"];

const HAND_WRITTEN_AVAILABILITY = [
  /on_?hand[a-z]{0,4}[^-]{0,30}-[^-]{0,40}(committed|reserved)/i,
  /available[a-z]{0,4}\s*[:=][^;,]{0,60}-[^;,]{0,40}(committed|reserved)/i,
];

const REMOVED_COPY = "availableQty: onHandQty - reservedQty,";

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

function offenders(): string[] {
  const hits: string[] = [];
  for (const root of SCANNED) {
    for (const path of sourceFiles(join(APP_ROOT, root))) {
      const flattened = stripComments(readFileSync(path, "utf8")).replace(/\s+/g, " ");
      if (HAND_WRITTEN_AVAILABILITY.some((pattern) => pattern.test(flattened))) {
        hits.push(relative(APP_ROOT, path));
      }
    }
  }
  return hits.sort();
}

describe("A1 — availability is read, never recomputed", () => {
  it("recognises the copy it was written to catch", () => {
    expect(HAND_WRITTEN_AVAILABILITY.some((pattern) => pattern.test(REMOVED_COPY))).toBe(true);
  });

  it("has no hand-written availability left in the app", () => {
    expect(offenders()).toEqual([]);
  });
});
