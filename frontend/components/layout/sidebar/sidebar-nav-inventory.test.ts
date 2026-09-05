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
// Moved 2026-09-03: the Finance "Settings" group gained an "Automations" child
// (/accounting/settings/automations, settings:automations:view). The page
// existed and was linked from the accounting settings tab strip, but navigation
// had no entry for it, so route-access resolved it by the longest matching nav
// prefix (/accounting/settings) and gated it on accounting:settings:read — a
// different key from the settings:automations:view the backend routes enforce,
// which is how a finance admin reached a page whose every request then 403s.
// This is the same shape as the /support sibling, which navigation already
// gates on settings:automations:view. Strictly narrowing for the page and
// additive for the sidebar: only OWNER/ORG_ADMIN hold settings:automations:view
// (ALL_PERMISSION_NAMES; no role template carries it), and they already saw the
// Finance Settings group.
// The digest exists so a route or its permission cannot change without somebody
// saying why.
// Updated 2026-09-06: Workflows nav group gained module: "workflows" (nav gate fix) and
// Variables/Secrets/Access routes moved to /workflows/settings/* (route-conformance §8).
const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "3bfb08350c8353fe7409c1e79263b7633ecaa583c62d95c5166584802f0dc894";

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
