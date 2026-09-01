import { createHash } from "node:crypto";
import { NAV_GROUPS, type NavRoute } from "./sidebar-nav-items";

// Changed 2026-08-31: CRM "API Keys" moved from /crm/api-keys to
// /crm/settings/api-keys (§8 — module-owned surfaces live in /<module>/settings/*),
// and the Knowledge group lost module: "documents" so KB reading stays universal.
// Moved 2026-08-30: /me/pay removed from PAYROLL_NAV_GROUPS — self-service pay
// belongs exclusively in HOME_NAV_GROUPS "For Me" group (product: home). The
// payroll product sidebar no longer lists it; the home sidebar already did.
// Moved 2026-08-27 (c25-03): 55 finance gates, plus /crm/deals/approvals and
// /hr/goals, named keys no route enforces — each now names the key its own
// endpoints check. `pnpm -C backend check:navigation-permissions` proves it.
// Moved 2026-09-01 by the HR dashboard route ("Dashboard", /hr/dashboard,
// gated on hr:analytics:read to match the page's own requirePermission call —
// not hr:employees:view, which would show it to people the page then denies).
// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "687edf720c46826da38a43bc25d19f2677832fcb3d274d3f2be489b448b2d66a";

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
