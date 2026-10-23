import { ORG_MODULE_NAME } from "@/lib/org-module-keys";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import {
  NAV_GROUPS,
  flattenNavRoutes,
  getNavGroupsForModule,
  getProductFromPathname,
} from "./sidebar-nav-items";
import { PRODUCT_DEFINITIONS } from "./sidebar-products";
import type { NavGroup, NavRoute, ModuleKey } from "./sidebar-nav-types";

const EVERY_MODULE = [...Object.keys(ORG_MODULE_NAME), "timesheets", "workflows"];
const DECLARED_GROUPS: NavGroup[] = [...NAV_GROUPS, ...HOME_NAV_GROUPS];

const ALL_PERMISSIONS = new Proxy<Record<string, unknown>>({}, { has: () => true });

function groupsShownFor(product: ModuleKey): NavGroup[] {
  return getNavGroupsForModule(product, "MEMBER", ALL_PERMISSIONS, EVERY_MODULE);
}

function leavesOf(group: NavGroup): NavRoute[] {
  return flattenNavRoutes(group.routes).filter((route) => Boolean(route.href));
}

const DECLARED_ROUTES = DECLARED_GROUPS.flatMap((group) =>
  leavesOf(group).map((route) => ({
    href: route.href as string,
    label: route.label,
    group: group.label,
    module: group.module,
  })),
);

describe("deep-linking a declared route reaches the sidebar that holds it", () => {
  it("has routes to check, so a silent empty sweep cannot pass", () => {
    expect(DECLARED_ROUTES.length).toBeGreaterThan(50);
  });

  it("resolves every declared route to the product whose group declares it", () => {
    const mismatched = DECLARED_ROUTES.filter(
      (route) => getProductFromPathname(route.href) !== route.module,
    ).map(
      (route) =>
        `${route.href} declared in ${route.module}/${route.group}, resolves to ${getProductFromPathname(route.href)}`,
    );

    expect(mismatched).toEqual([]);
  });

  it("shows the route's own group in the sidebar that product renders", () => {
    const missing = DECLARED_ROUTES.filter((route) => {
      const product = getProductFromPathname(route.href);
      return !groupsShownFor(product).some(
        (group) => group.label === route.group,
      );
    }).map((route) => `${route.href} → ${route.group}`);

    expect(missing).toEqual([]);
  });

  it("puts the route itself among the links that sidebar lists", () => {
    const absent = DECLARED_ROUTES.filter((route) => {
      const product = getProductFromPathname(route.href);
      const hrefs = groupsShownFor(product).flatMap((group) =>
        leavesOf(group).map((leaf) => leaf.href),
      );
      return !hrefs.includes(route.href);
    }).map((route) => route.href);

    expect(absent).toEqual([]);
  });

  it("leaves no product with an empty sidebar for an owner holding every module", () => {
    const empty = PRODUCT_DEFINITIONS.map((product) => product.key).filter(
      (product) => groupsShownFor(product).length === 0,
    );

    expect(empty).toEqual([]);
  });
});
