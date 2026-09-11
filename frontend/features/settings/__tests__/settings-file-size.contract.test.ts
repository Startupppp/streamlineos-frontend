import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * File-size gate for the settings/organization branding and localization sections.
 * Ceiling is 300 physical lines, matching the CLAUDE.md §7 target.
 * Line counting matches check-file-sizes.mjs countLines exactly.
 *
 * Another agent is shrinking org-branding-section.tsx from 313 lines. Write the
 * assertion at ≤300 regardless; if the file is still over 300 when the suite runs,
 * report RED honestly — do not raise the ceiling or skip the test.
 */

const SETTINGS_ORG_DIR = resolve(__dirname, "..", "organization");
const BRANDING_FILE = join(SETTINGS_ORG_DIR, "org-branding-section.tsx");
const LOCALIZATION_FILE = join(SETTINGS_ORG_DIR, "org-localization-section.tsx");
const CEILING = 300;

// Mirror of check-file-sizes.mjs countLines — trailing-newline aware.
function countLines(content: string): number {
  const parts = content.split("\n");
  return content.endsWith("\n") ? parts.length - 1 : parts.length;
}

function countLinesFromFile(filePath: string): number {
  return countLines(readFileSync(filePath, "utf8"));
}

// ---------------------------------------------------------------------------
// Detector self-test — the counting function must be unable to lie
// ---------------------------------------------------------------------------

describe("settings file size — countLines self-test", () => {
  it("returns 301 for a synthetic 301-line string with a trailing newline", () => {
    const content = Array.from({ length: 301 }, (_, i) => `const x${i} = ${i};`).join("\n") + "\n";
    expect(countLines(content)).toBe(301);
  });

  it("BITE PROOF — a 301-line count is > 300", () => {
    const content = Array.from({ length: 301 }, (_, i) => `const x${i} = ${i};`).join("\n") + "\n";
    expect(countLines(content) > CEILING).toBe(true);
  });

  it("counts a trailing-newline file correctly — 3 lines", () => {
    expect(countLines("a\nb\nc\n")).toBe(3);
  });

  it("counts a no-trailing-newline file correctly — 3 lines", () => {
    expect(countLines("a\nb\nc")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// File existence guards — missing/renamed file must fail loudly, not read as 0 lines
// ---------------------------------------------------------------------------

describe("settings file size — target files exist", () => {
  it("org-branding-section.tsx exists and has a non-zero line count", () => {
    expect(existsSync(BRANDING_FILE)).toBe(true);
    expect(countLinesFromFile(BRANDING_FILE)).toBeGreaterThan(0);
  });

  it("org-localization-section.tsx exists and has a non-zero line count", () => {
    expect(existsSync(LOCALIZATION_FILE)).toBe(true);
    expect(countLinesFromFile(LOCALIZATION_FILE)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Ceiling enforcement — both files must be ≤ 300 physical lines
// ---------------------------------------------------------------------------

describe("settings file size — 300-line ceiling", () => {
  it("org-branding-section.tsx is at most 300 physical lines", () => {
    const lines = countLinesFromFile(BRANDING_FILE);
    if (lines > CEILING) {
      throw new Error(
        `org-branding-section.tsx has ${lines} lines (ceiling: ${CEILING}). ` +
          `Extract a cohesive component or hook — do not raise the ceiling.`,
      );
    }
    expect(lines).toBeLessThanOrEqual(CEILING);
  });

  it("org-localization-section.tsx is at most 300 physical lines", () => {
    const lines = countLinesFromFile(LOCALIZATION_FILE);
    if (lines > CEILING) {
      throw new Error(
        `org-localization-section.tsx has ${lines} lines (ceiling: ${CEILING}). ` +
          `Extract a cohesive component or hook — do not raise the ceiling.`,
      );
    }
    expect(lines).toBeLessThanOrEqual(CEILING);
  });
});
