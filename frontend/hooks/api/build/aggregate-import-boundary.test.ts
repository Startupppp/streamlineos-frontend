import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import KNOWN_AGGREGATE_IMPORTERS from "./aggregate-import-known.json";

const frontendRoot = join(__dirname, "..", "..", "..");
const buildFeatureRoot = join(frontendRoot, "features", "build");
const consumerRoots = ["features", "components", "app", "lib"];

const skippedDirectories = new Set([
  ".git",
  ".next",
  ".next-e2e",
  "coverage",
  "node_modules",
]);

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

function relativePath(path: string): string {
  return relative(frontendRoot, path).split(sep).join("/");
}

function aggregateImportersUnder(roots: string[]): string[] {
  return roots
    .map((root) => join(frontendRoot, root))
    .filter((root) => existsSync(root))
    .flatMap((root) => listProductionSourceFiles(root))
    .filter((path) => hooksAggregatePattern.test(readFileSync(path, "utf8")))
    .map(relativePath)
    .sort();
}

it("no Build feature file imports from the hooks aggregate or Build hooks barrel", () => {
  const violations = listProductionSourceFiles(buildFeatureRoot)
    .filter((path) => hooksAggregatePattern.test(readFileSync(path, "utf8")))
    .map((path) => `/${relativePath(path)}`);

  expect(violations).toEqual([]);
});

describe("every other consumer of the Build hooks, ratcheted shrink-only", () => {
  const measured = aggregateImportersUnder(consumerRoots);

  it("adds no file that is not already known about", () => {
    const known = new Set<string>(KNOWN_AGGREGATE_IMPORTERS);
    const added = measured.filter((path) => !known.has(path));

    expect(added).toEqual([]);
  });

  it("keeps no entry for a file that no longer imports an aggregate", () => {
    const still = new Set(measured);
    const stale = KNOWN_AGGREGATE_IMPORTERS.filter((path) => !still.has(path));

    expect(stale).toEqual([]);
  });

  it("names no Build feature file, because Build is a hard zero and a ratchet entry would excuse it", () => {
    const buildEntries = KNOWN_AGGREGATE_IMPORTERS.filter((path) =>
      path.startsWith("features/build/"),
    );

    expect(buildEntries).toEqual([]);
  });
});

it("self-test: the resolver reaches every consumer root and the pattern is not vacuous", () => {
  expect(listProductionSourceFiles(buildFeatureRoot).length).toBeGreaterThan(50);

  const reached = consumerRoots.map((root) => [
    root,
    listProductionSourceFiles(join(frontendRoot, root)).length > 0,
  ]);
  expect(reached).toEqual([
    ["features", true],
    ["components", true],
    ["app", true],
    ["lib", true],
  ]);

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

  expect(KNOWN_AGGREGATE_IMPORTERS.length).toBeGreaterThan(0);
  expect(new Set(KNOWN_AGGREGATE_IMPORTERS).size).toBe(
    KNOWN_AGGREGATE_IMPORTERS.length,
  );
});
