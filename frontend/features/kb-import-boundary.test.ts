import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function findCrossImports(sourceDir: string, forbiddenSegment: string): string[] {
  const violations: string[] = [];
  for (const file of collectSourceFiles(sourceDir)) {
    const content = readFileSync(file, "utf8");
    if (content.includes(forbiddenSegment)) {
      violations.push(file);
    }
  }
  return violations;
}

const FEATURES = join(__dirname);
const HELP_CENTRE = join(FEATURES, "help-centre");
const WIKI = join(FEATURES, "wiki");

describe("kb import boundary", () => {
  it("help-centre does not import wiki", () => {
    const violations = findCrossImports(HELP_CENTRE, "@/features/wiki/");
    expect(violations).toEqual([]);
  });

  it("wiki does not import help-centre", () => {
    const violations = findCrossImports(WIKI, "@/features/help-centre/");
    expect(violations).toEqual([]);
  });
});
