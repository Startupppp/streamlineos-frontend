import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildScopeCatalog, splitDestinationHref } from "./build-nav-model";
import {
  BUILD_BROWSE_ALL_DESTINATION,
  BUILD_MY_WORK_DESTINATIONS,
} from "./nav/build-stable-destinations";
import { resolveBuildScope } from "./build-scope";
import type { BuildNavDestination } from "./nav/build-nav-destination";

const SCOPE_PATHS = [
  "/build",
  "/build/workspaces/ws-1",
  "/build/managed-products/7",
  "/build/42",
];

function everyCatalogDestination(): BuildNavDestination[] {
  const all: BuildNavDestination[] = [...BUILD_MY_WORK_DESTINATIONS, BUILD_BROWSE_ALL_DESTINATION];
  for (const path of SCOPE_PATHS) {
    const catalog = buildScopeCatalog(resolveBuildScope(path));
    all.push(...catalog.primary, ...catalog.moreTools);
    if (catalog.settings) all.push(catalog.settings);
  }
  return all;
}

const APP_BUILD_DIR = resolve(process.cwd(), "app", "(authenticated)", "build");

function mapHrefPathToAppDir(path: string): string {
  const withoutRoot = path.replace(/^\/build\/?/, "");
  if (withoutRoot === "") return APP_BUILD_DIR;
  const segments = withoutRoot.split("/");
  const mapped: string[] = [];
  let index = 0;
  if (/^\d+$/.test(segments[0])) {
    mapped.push("[projectId]");
    index = 1;
  } else if (segments[0] === "managed-products" && segments[1] !== undefined) {
    mapped.push("managed-products", "[managedProductId]");
    index = 2;
  } else if (segments[0] === "workspaces" && segments[1] !== undefined) {
    mapped.push("workspaces", "[pmWorkspaceId]");
    index = 2;
  }
  for (; index < segments.length; index++) mapped.push(segments[index]);
  return join(APP_BUILD_DIR, ...mapped);
}

const destinations = everyCatalogDestination();

function missingPageFiles(): string[] {
  const missing: string[] = [];
  for (const destination of destinations) {
    const { path } = splitDestinationHref(destination.href);
    const dir = mapHrefPathToAppDir(path);
    if (!existsSync(join(dir, "page.tsx"))) missing.push(`${destination.id} -> ${path}`);
  }
  return missing.sort();
}

describe("every Build nav catalog href resolves to a real page.tsx", () => {
  it("covers a non-trivial number of destinations, so a broken enumeration cannot pass vacuously", () => {
    expect(destinations.length).toBeGreaterThan(40);
  });

  it("finds a page.tsx for every catalog href, so a dangling route cannot land in a catalog undetected", () => {
    expect(missingPageFiles()).toEqual([]);
  });
});
