import { createHash } from "node:crypto";
import { NAV_GROUPS, type NavRoute } from "./sidebar-nav-items";

// Changed 2026-08-31 by the origin/main merge: 266 commits of navigation work
// landed alongside this branch — route-access management (`enforce-route-access`),
// My Payroll repointed at the canonical /me/pay with its vacuous gate dropped,
// two authenticated pages that denied everyone repaired, and the module manifest
// becoming schema-validated JSON. The inventory routes themselves are unchanged;
// the digest moves because the graph it hashes is the whole sidebar.
// Moved 2026-08-29 by B10: the throughput/SLA dashboard got its nav entry
// ("Operations SLA", /inventory/reports/throughput, on inventory:reports:read).
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
// Changed 2026-08-31: CRM "API Keys" moved from /crm/api-keys to
// /crm/settings/api-keys (§8 — module-owned surfaces live in /<module>/settings/*),
// and the Knowledge group lost module: "documents" so KB reading stays universal.
// Moved 2026-08-30: /me/pay removed from PAYROLL_NAV_GROUPS — self-service pay
// belongs exclusively in HOME_NAV_GROUPS "For Me" group (product: home). The
// payroll product sidebar no longer lists it; the home sidebar already did.
// Moved 2026-08-27 (c25-03): 55 finance gates, plus /crm/deals/approvals and
// /hr/goals, named keys no route enforces — each now names the key its own
// endpoints check. `pnpm -C backend check:navigation-permissions` proves it.
// Moved 2026-08-25 by the CRM import/export route ("Import & export",
// /crm/import, gated on party:parties:view because export is ungated by design).
// Moved 2026-08-24 by the CRM autonomy review route ("What the system did",
// /crm/autonomy, gated on crm:autonomy:view). The digest exists so a route or
// its permission cannot change without somebody saying why.
// Moved 2026-08-29 by F3/F6: the inventory AI surfaces got their first nav entry
// ("AI", /inventory/ai, gated on inventory:ai:read). Before it, the copilot was
// written, tested and mounted on no route at all — a page nobody can navigate to
// has not shipped — and the anomaly queue and demand-risk narrative would have
// landed in the same state. The gate is the surfaces' own key rather than
// inventory:stock:read, because that is what the pages behind it require and a
// parent asking for less shows the entry to people who then hit
// NoPermissionState.
// Moved 2026-08-30 by NEO-2/NEO-3, NEO-4 and NEO-5: three inventory routes got
// their first nav entries. "Quick commerce" (/inventory/quick-commerce, gated on
// inventory:channels:manage) is where platform purchase orders from Blinkit,
// Instamart and Zepto arrive and where fill rate is read. "Handling units"
// (/inventory/handling-units, on inventory:stock:read) is the pallet, cage or
// tote stock now stands on. "My tasks (RF)" (/inventory/rf, on
// inventory:stock:read) is the one-task-at-a-time operator surface; it is gated
// on the read key rather than on a write key because the queue itself is a read,
// and each runner behind it re-gates on the key its own command needs.
// Moved 2026-08-30 by NEO-6 and NEO-7: two more inventory routes got nav
// entries. "Slotting" (/inventory/slotting, on inventory:warehouses:read) is
// where the rules that decide which zone a SKU lives in are read, alongside the
// nightly re-slot recommendations. "Labour" (/inventory/labor) is gated on
// inventory:labor:read — its own key rather than inventory:reports:read, because
// that screen names individual people and rates their work, which is an
// authority an organisation should grant deliberately rather than one that
// arrives with the ability to read a stock summary.
// Moved 2026-08-30 by NEO-9, NEO-11 and NEO-12: three more inventory routes got
// nav entries. "Kits" (/inventory/kits, on inventory:products:read) is a kit's
// bill of materials and the build command; the assemble action behind it re-gates
// on inventory:kits:assemble, because building consumes components and creates a
// SKU that did not exist a moment ago. "Consignment" (/inventory/consignment, on
// inventory:stock:read) lists stock standing in the building that belongs to
// somebody else; taking title re-gates on inventory:stock:adjust. "Dock"
// (/inventory/dock) is gated on inventory:dock:manage — booking vehicles in is a
// receiving clerk's job rather than the person who configures the site.
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "d306efa9d442b75f4dfe864a6f96ce9a0d55188f28d6885fdd93b51a2534b1f7";
  "5bf9eeab85643ea8e3a42147f6ebb0e52750a7cc07d0dc8d6bcc649ebebfb8ed";

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
