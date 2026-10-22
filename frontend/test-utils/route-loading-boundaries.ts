import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function posixRelative(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

const AUTHENTICATED_ROOT = resolve(__dirname, "../app/(authenticated)");

export interface RouteLoadingCoverage {
  root: string;
  routes: string[];
  boundaries: string[];
  uncovered: string[];
}

export function findNearestBoundary(
  routeDir: string,
  segmentRoot: string,
  hasBoundary: (directory: string) => boolean,
): string | null {
  let directory = routeDir;
  for (;;) {
    if (hasBoundary(directory)) return directory;
    if (directory === segmentRoot) return null;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function collect(directory: string, fileName: string, into: string[]): void {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) collect(path, fileName, into);
    else if (entry === fileName) into.push(path);
  }
}

export function analyzeRouteLoadingBoundaries(
  root: string = AUTHENTICATED_ROOT,
): RouteLoadingCoverage {
  const routes: string[] = [];
  const boundaries: string[] = [];
  collect(root, "page.tsx", routes);
  collect(root, "loading.tsx", boundaries);

  const hasBoundary = (directory: string): boolean =>
    existsSync(join(directory, "loading.tsx"));

  const uncovered = routes
    .filter(
      (route) => findNearestBoundary(dirname(route), root, hasBoundary) === null,
    )
    .map((route) => posixRelative(root, route));

  return {
    root,
    routes: routes.map((route) => posixRelative(root, route)).sort(),
    boundaries: boundaries.map((file) => posixRelative(root, file)).sort(),
    uncovered: uncovered.sort(),
  };
}

export { AUTHENTICATED_ROOT };
