/**
 * A1 — the web app never computes availability; it renders the server's.
 *
 * The stock-summary report mapped `availableQty: onHandQty - reservedQty` and
 * fed that number to the column literally headed "Available", to the
 * Out-of-stock / Low-stock badge and to the CSV export. Availability is
 * `on_hand − committed − blocked_qty − quality_hold_qty − outgoing_qty`, and is
 * zero at a location that may not be sold from, so the screen was over-stating
 * every SKU that had stock blocked, on quality hold, picked onto a packing
 * bench, or riding in a van between two warehouses.
 *
 * It could not be corrected in the mapper either: the row the API returned did
 * not carry the other three terms, and the sellable gate is per stock-level row,
 * which a summed figure has already thrown away. The endpoint computes it now.
 *
 * So the rule this pins is not "compute it correctly here" but "do not compute
 * it here at all" — the API owns the number, the client displays it.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const APP_ROOT = join(__dirname, "..", "..", "..");

/** Everywhere an inventory number could be rendered from. */
const SCANNED = ["app", "components", "features", "hooks", "lib"];

/**
 * A bucket subtracted from another bucket. Matched against source with comments
 * removed and whitespace flattened, so a copy spread over several lines reads
 * the same as one written inline.
 */
const HAND_WRITTEN_AVAILABILITY = [
  /on_?hand[a-z]{0,4}[^-]{0,30}-[^-]{0,40}(committed|reserved)/i,
  /available[a-z]{0,4}\s*[:=][^;,]{0,60}-[^;,]{0,40}(committed|reserved)/i,
];

/** The copy this change removed, exactly as it was written. */
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
    // A detector that matches nothing passes for exactly as long as it is
    // useless, so it is checked against the line it exists to have caught.
    expect(HAND_WRITTEN_AVAILABILITY.some((pattern) => pattern.test(REMOVED_COPY))).toBe(true);
  });

  it("has no hand-written availability left in the app", () => {
    expect(offenders()).toEqual([]);
  });
});
