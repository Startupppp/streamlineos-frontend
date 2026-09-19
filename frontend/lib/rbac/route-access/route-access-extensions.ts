import { ROUTE_ACCESS_EXTENSIONS } from "./route-access-extension-entries";
import type { RouteAccessExtension } from "./route-access-extension-types";

function segmentsOf(value: string): string[] {
  return value.split("/").filter((segment) => segment.length > 0);
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function prefixCovers(prefix: string[], path: string[]): boolean {
  if (path.length < prefix.length) return false;
  return prefix.every((segment, index) => {
    const actual = path[index];
    if (actual === undefined || actual.length === 0) return false;
    return isDynamicSegment(segment) ? true : segment === actual;
  });
}

function specificityOf(prefix: string[]): number {
  const literals = prefix.filter((segment) => !isDynamicSegment(segment)).length;
  return prefix.length * 1000 + literals;
}

export function routeAccessExtensionCovers(
  entry: RouteAccessExtension,
  pathname: string,
): boolean {
  const prefix = segmentsOf(entry.prefix);
  const path = segmentsOf(pathname);
  if (!prefixCovers(prefix, path)) return false;
  if (entry.exact) return path.length === prefix.length;
  if (entry.descendantsOnly) return path.length > prefix.length;
  return true;
}

export function matchRouteAccessExtension(
  pathname: string,
): RouteAccessExtension | null {
  let best: RouteAccessExtension | null = null;
  let bestScore = -1;
  for (const entry of ROUTE_ACCESS_EXTENSIONS) {
    const prefix = segmentsOf(entry.prefix);
    if (!routeAccessExtensionCovers(entry, pathname)) continue;
    const score = specificityOf(prefix);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}
