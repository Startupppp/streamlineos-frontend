import { ORG_MODULE_NAME } from "@/lib/module-vocabulary";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import {
  NAV_GROUPS,
  flattenNavRoutes,
  getNavGroupsForProduct,
  getProductFromPathname,
} from "./sidebar-nav-items";
import { PRODUCT_DEFINITIONS } from "./sidebar-products";
import type { NavGroup, NavRoute, ProductKey } from "./sidebar-nav-types";

/**
 * The chain, not its links. `getProductFromPathname` and `getNavGroupsForProduct`
 * are each already pinned; nothing asserted that following one into the other
 * lands a route in the sidebar it actually appears in.
 *
 * That composition is what "deep-linking activates the right product" means, and
 * it is provable here. What is NOT provable here is that the result renders,
 * fits, and highlights — those need a browser, and the ticket says so.
 */

const EVERY_MODULE = [...Object.keys(ORG_MODULE_NAME), "timesheets", "workflows"];
const DECLARED_GROUPS: NavGroup[] = [...NAV_GROUPS, ...HOME_NAV_GROUPS];

function groupsShownFor(product: ProductKey): NavGroup[] {
  return getNavGroupsForProduct(product, "OWNER", {}, EVERY_MODULE);
}

function leavesOf(group: NavGroup): NavRoute[] {
  return flattenNavRoutes(group.routes).filter((route) => Boolean(route.href));
}

/** Every (group, route) the navigation model declares, with the product it claims. */
const DECLARED_ROUTES = DECLARED_GROUPS.flatMap((group) =>
  leavesOf(group).map((route) => ({
    href: route.href as string,
    label: route.label,
    group: group.label,
    product: group.product,
  })),
);

describe("deep-linking a declared route reaches the sidebar that holds it", () => {
  it("has routes to check, so a silent empty sweep cannot pass", () => {
    expect(DECLARED_ROUTES.length).toBeGreaterThan(50);
  });

  it("resolves every declared route to the product whose group declares it", () => {
    const mismatched = DECLARED_ROUTES.filter(
      (route) => getProductFromPathname(route.href) !== route.product,
    ).map(
      (route) =>
        `${route.href} declared in ${route.product}/${route.group}, resolves to ${getProductFromPathname(route.href)}`,
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
