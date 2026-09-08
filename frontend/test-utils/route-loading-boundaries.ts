import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function posixRelative(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

/**
 * Which authenticated routes paint a skeleton the moment a navigation starts.
 *
 * The App Router does not blank the screen while a server segment resolves: it
 * keeps the PREVIOUS page painted and swaps only when the new one is ready. So
 * a route with no `loading.tsx` at or above it looks unresponsive for exactly
 * as long as its slowest server component takes, no matter what the trigger
 * was — `<Link>`, `router.push`, a row click or a breadcrumb. A `loading.tsx`
 * is the Suspense boundary that turns that dead window into a skeleton, and it
 * covers the segment it sits in AND every segment nested beneath it, which is
 * why this walks upward from each route rather than demanding one per page.
 *
 * WHAT THIS CANNOT SEE: whether the skeleton resembles the page it stands in
 * for, and whether a client-side fetch inside an already-painted page has its
 * own loading branch — `authenticated-surface-states.contract` judges that.
 * This is only the boundary's presence, which is the part the router itself
 * decides.
 */

const AUTHENTICATED_ROOT = resolve(__dirname, "../app/(authenticated)");

export interface RouteLoadingCoverage {
  root: string;
  routes: string[];
  boundaries: string[];
  uncovered: string[];
}

/**
 * The upward walk, kept pure so the walk itself can be tested against a
 * synthetic tree. A scan that reports "nothing missing" because it never
 * looked is the failure mode worth guarding.
 */
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
