import { createHash } from "node:crypto";
import { NAV_GROUPS, type NavRoute } from "./sidebar-nav-items";

// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
/**
 * Updated 2026-08-26, for two changes that both belong in the graph:
 *
 *  - **Record Layouts** joined CRM settings (ticket 20's per-tenant layouts).
 *  - Its `requiredPermission` was `settings:manage` -- a platform-wide key on a
 *    CRM page, where every sibling uses a `crm:` one -- while the page itself
 *    gates on `crm:settings:view`. The nav therefore hid the entry from people
 *    the page would have admitted, and offered it to people it would refuse.
 *    Aligned to the page.
 */
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "0810f4047b9d1fde69b7d4f5fe56c58545c0b1e0103e99d9f884872738254902";

function serializeNavigationRoute(route: NavRoute): unknown {
  return {
    label: route.label,
    href: route.href,
    badge: route.badge,
    requiredPermission: route.requiredPermission,
    module: route.module,
    modulesAny: route.modulesAny,
    exact: route.exact,
    activePrefixes: route.activePrefixes,
    inactivePrefixes: route.inactivePrefixes,
    children: route.children?.map(serializeNavigationRoute),
  };
}

describe("sidebar navigation inventory", () => {
  it("preserves the ordered route and access graph across configuration files", () => {
    const navigationInventory = NAV_GROUPS.map((group) => ({
      label: group.label,
      defaultCollapsed: group.defaultCollapsed,
      requiredPermission: group.requiredPermission,
      product: group.product,
      module: group.module,
      routes: group.routes.map(serializeNavigationRoute),
    }));
    const inventoryDigest = createHash("sha256")
      .update(JSON.stringify(navigationInventory))
      .digest("hex");

    expect(inventoryDigest).toBe(EXPECTED_NAVIGATION_INVENTORY_DIGEST);
  });
});
