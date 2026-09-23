import fs from "node:fs";
import path from "node:path";

const WIKI_SRC = path.resolve(__dirname, "..");

function walk(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, found);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
      found.push(full);
  }
  return found;
}

const FORBIDDEN_STORAGE_PATTERNS: RegExp[] = [
  /localStorage\.setItem\s*\(\s*['"`]content['"`]/,
  /localStorage\.setItem\s*\(\s*['"`]contentText['"`]/,
  /sessionStorage\.setItem\s*\(\s*['"`]content['"`]/,
  /sessionStorage\.setItem\s*\(\s*['"`]contentText['"`]/,
];

describe("Wiki page body must not reach Web Storage", () => {
  const sourceFiles = walk(WIKI_SRC);

  it("collects at least one wiki source file — scanner is not vacuous", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("(a) no localStorage.setItem or sessionStorage.setItem writes the content or contentText key", () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const src = fs.readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_STORAGE_PATTERNS) {
        if (pattern.test(src)) {
          violations.push(`${path.relative(WIKI_SRC, file)}: ${pattern.toString()}`);
        }
      }
    }
    expect(violations).toHaveLength(0);
  });

  it("(b) orgScopedStorage writes in wiki source do not use a content or contentText key", () => {
    const violations: string[] = [];
    const orgStoragePattern =
      /orgScopedStorage\s*\.\s*\w+\s*\(\s*['"`][^'"`,]*(?:^content|contentText)[^'"`,]*['"`]/i;
    for (const file of sourceFiles) {
      const src = fs.readFileSync(file, "utf-8");
      if (orgStoragePattern.test(src)) {
        violations.push(path.relative(WIKI_SRC, file));
      }
    }
    expect(violations).toHaveLength(0);
  });
});
