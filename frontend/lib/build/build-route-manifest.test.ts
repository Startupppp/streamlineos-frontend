import { readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { BUILD_ROUTE_MANIFEST } from "./build-route-manifest";

const APP_AUTH_DIR = resolve(process.cwd(), "app", "(authenticated)");
const APP_BUILD_DIR = join(APP_AUTH_DIR, "build");

function collectPageFilePaths(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectPageFilePaths(full));
    } else if (entry.name === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

function absolutePathToRoute(absolutePath: string): string {
  const rel = relative(APP_AUTH_DIR, absolutePath);
  const normalized = rel.split(sep).join("/");
  return "/" + normalized.replace(/\/page\.tsx$/, "");
}

const manifestRoutes = new Set(BUILD_ROUTE_MANIFEST.map((e) => e.route));
const diskRoutes = new Set(
  collectPageFilePaths(APP_BUILD_DIR).map(absolutePathToRoute),
);

describe("BLD-001 — build route manifest covers all 83 authenticated build pages bidirectionally", () => {
  it("manifest has 83 entries so the coverage check cannot pass vacuously with an empty or truncated list", () => {
    expect(BUILD_ROUTE_MANIFEST).toHaveLength(83);
  });

  it("disk route count matches manifest count so neither direction can silently absorb extra entries", () => {
    expect(diskRoutes.size).toBe(BUILD_ROUTE_MANIFEST.length);
  });

  it("every manifest route has a page.tsx on disk so no phantom disposition can exist in the manifest", () => {
    const missing = [...manifestRoutes].filter((route) => !diskRoutes.has(route));
    expect(missing).toEqual([]);
  });

  it("every page.tsx on disk appears in the manifest so no unreviewed route can land undetected", () => {
    const untracked = [...diskRoutes].filter((route) => !manifestRoutes.has(route));
    expect(untracked).toEqual([]);
  });
});
