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
// Moved 2026-09-02: the Support group and its /support + /support/inbox routes
// were gated on build:tickets:view, a Build key on Support routes, so the links
// tracked Build access instead of Support access. Repointed to
// dashboard:support:view and support:tickets:view to match what those pages read.
// Moved 2026-09-03: the Build "Settings" route (/build/settings/integrations)
// and the Build group's admission list were gated on settings:manage, a global
// key, for a surface Build owns. The four git-connection routes moved to
// /integrations/git/connections behind integrations:git:view|manage, and
// MODULE_ADMIN_EXTRA_KEYS.build now grants that pair, so a BUILD_MODULE_ADMIN
// holds the key but could not see the link. Repointed to integrations:git:view.
// Strictly widening: OWNER and ORG_ADMIN are ALL_PERMISSION_NAMES and no role
// template carries settings:manage, so nobody who saw the item loses it.
// The digest exists so a route or its permission cannot change without somebody
// saying why.
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "3f26f8481b2bb67e31e6f6152ff0105943047b01c41503ab88291765c28a7527";

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
