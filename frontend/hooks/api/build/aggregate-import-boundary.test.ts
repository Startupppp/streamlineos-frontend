import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const frontendRoot = join(__dirname, "..", "..", "..");
const buildFeatureRoot = join(frontendRoot, "features", "build");

const skippedDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
]);

/**
 * Matches a bare import of the cross-module aggregate (`@/hooks/api`) or
 * the Build barrel (`@/hooks/api/build`).  Deep imports such as
 * `@/hooks/api/build/projects` are intentionally NOT matched because they
 * have a path segment after the module root.
 */
const hooksAggregatePattern =
  /from\s+["'](?:@\/hooks\/api|@\/hooks\/api\/build)["']/;

function listProductionSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (skippedDirectories.has(entry)) return [];
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listProductionSourceFiles(path);
    if (!/\.(?:ts|tsx)$/.test(entry)) return [];
    if (/(?:\.test|\.spec)\.(?:ts|tsx)$/.test(entry)) return [];
    return [path];
  });
}

it("no Build feature file imports from the hooks aggregate or Build hooks barrel", () => {
  const files = listProductionSourceFiles(buildFeatureRoot);

  const violations = files.flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return hooksAggregatePattern.test(source)
      ? [`/${relative(frontendRoot, path).split(sep).join("/")}`]
      : [];
  });

  expect(violations).toEqual([]);
});

it("self-test: resolver finds Build feature files and the pattern is not vacuous", () => {
  const files = listProductionSourceFiles(buildFeatureRoot);

  expect(files.length).toBeGreaterThan(50);

  expect(
    hooksAggregatePattern.test(`import { useProject } from "@/hooks/api"`),
  ).toBe(true);

  expect(
    hooksAggregatePattern.test(`import { useCycles } from "@/hooks/api/build"`),
  ).toBe(true);

  expect(
    hooksAggregatePattern.test(
      `import { useProject } from "@/hooks/api/build/projects"`,
    ),
  ).toBe(false);

  expect(
    hooksAggregatePattern.test(`import { useCan } from "@/hooks/api/access"`),
  ).toBe(false);
});
