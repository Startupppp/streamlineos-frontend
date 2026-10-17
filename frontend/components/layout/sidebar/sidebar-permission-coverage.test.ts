import type { NavRoute } from "./sidebar-nav-items";
import { flattenNavRoutes, NAV_GROUPS } from "./sidebar-nav-items";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { isUniversalRoute } from "@/lib/rbac/route-access/universal-routes";

/**
 * Access administration and module-level settings are never universal, even
 * under a universal prefix: /chat is everyone's while /chat/access governs
 * admin administration of it. /directory is the people
 * directory (universal), /directory/settings is the directory config (admin).
 */
function isUniversal(href: string): boolean {
  return isUniversalRoute(href);
}

function describeRoute(route: NavRoute): string {
  const required = route.requiredPermission;
  const keys = required
    ? Array.isArray(required)
      ? required.join(" | ")
      : required
    : "none";
  return `${route.href}  (${route.label})  [${keys}]`;
}

describe("sidebar navigation is permission-driven", () => {
  const routes = flattenNavRoutes(
    [...NAV_GROUPS, ...HOME_NAV_GROUPS].flatMap((group) => group.routes),
  );

  it("collects the whole navigation tree", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it("scans the Home navigation, not only the product navigation", () => {
    const scanned = new Set(routes.map((route) => route.href));
    const missing = flattenNavRoutes(
      HOME_NAV_GROUPS.flatMap((group) => group.routes),
    )
      .map((route) => route.href)
      .filter((href) => !scanned.has(href))
      .sort();
    expect(missing).toEqual([]);
    expect(scanned.has("/calendar")).toBe(true);
    expect(scanned.has("/chat")).toBe(true);
    expect(scanned.has("/dashboard")).toBe(true);
  });

  it("gates every non-universal route on a permission", () => {
    const ungated = routes
      .filter((route) => !route.requiredPermission)
      .filter((route) => !isUniversal(route.href))
      .map(describeRoute)
      .sort();
    expect(ungated).toEqual([]);
  });

  it("never gates a universal surface, which every active member keeps", () => {
    const gatedUniversal = routes
      .filter((route) => route.requiredPermission && isUniversal(route.href))
      .map(describeRoute)
      .sort();
    expect(gatedUniversal).toEqual([]);
  });
});
