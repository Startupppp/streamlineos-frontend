import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../..");
const SCANNED_DIRS = ["app", "features", "components"];
const SOURCE = /\.(tsx|ts)$/;
const SKIP = /\.(test|spec)\.(tsx|ts)$/;

const LEGACY_ROLE_GATE = [
  /\bHR_ROLES\b/,
  /\bACCOUNTING_ROLES\b/,
  /\[[^\]]*"FINAL"[^\]]*\]\s*\.includes\s*\(\s*role/,
  /session\?\.user\?\.role\s*(?:===|!==)/,
  /\(session\?\.user\s+as\s*\{\s*role/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (SOURCE.test(entry) && !SKIP.test(entry)) out.push(full);
  }
  return out;
}

describe("authorization never reads a legacy session role", () => {
  const files = SCANNED_DIRS.flatMap((dir) => walk(join(ROOT, dir)));

  it("scans a real file tree, so an empty sweep cannot pass", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("detects a legacy gate when one is present", () => {
    const sample = 'const isHr = HR_ROLES.includes(role);';
    expect(LEGACY_ROLE_GATE.some((pattern) => pattern.test(sample))).toBe(true);
  });

  it("has no hard-coded session-role authorization gate left", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of LEGACY_ROLE_GATE)
        if (pattern.test(source)) {
          offenders.push(relative(ROOT, file));
          break;
        }
    }
    expect(offenders.sort()).toEqual([]);
  });
});
