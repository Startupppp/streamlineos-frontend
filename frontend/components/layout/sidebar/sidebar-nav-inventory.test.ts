import { createHash } from "node:crypto";
import { NAV_GROUPS, type NavRoute } from "./sidebar-nav-items";

// Moved 2026-08-29 by C2/C5/C7: the Planning group and its Replenishment child
// shared an href but asked for `inventory:reports:read` while that page asks for
// `inventory:replenishment:read` — so a reports-only reader saw the entry and
// landed on NoPermissionState. Both now ask for what the page asks for. A parent
// nobody may open is not a dead end: `filterRoute` promotes its accessible
// children, so that reader still reaches Forecasting, Valuation, Costing and
// Reconciliation. Two routes that had pages and no way to reach them joined the
// group: "Transfer recommendations" (/inventory/replenishment/transfers) and
// "Forecast drift" (/inventory/replenishment/drift), both on
// inventory:replenishment:read.
// Moved 2026-08-29 by G1: the inventory audit trail got its first read surface
// ("Audit Trail", /inventory/reports/audit-trail, gated on inventory:audit:read
// — a key of its own, because inventory:audit:export is the right to take a
// checksummed evidence bundle away, not the right to look at the trail).
// Moved 2026-08-29 by A6: nine inventory routes were gated on a key their page
// does not use. Dashboard now accepts inventory:stock:read OR inventory:reports:read
// (it serves a stock-safe subset instead of the onboarding empty state); Operations
// accepts purchase-orders:read OR sales-orders:read; Packages, Loads and 3PL moved off
// inventory:shipments:manage onto their own manage keys; Valuation and Costing moved off
// inventory:reports:read onto inventory:valuation:read; Import moved off
// inventory:products:read onto inventory:import.
// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "5934166ca04c8e75149d30a9ecd3645e261f46e7fea9acbfd0ee77476fcbb533";

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
