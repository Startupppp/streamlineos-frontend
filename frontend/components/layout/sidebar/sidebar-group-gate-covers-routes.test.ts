import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { NAV_GROUPS } from "./sidebar-nav-items";
import type { NavGroup } from "./sidebar-nav-types";

/**
 * A group with its own `requiredPermission` opens only for a caller holding one
 * of those keys. Every key one of its routes needs must therefore be in that
 * list, or a member who holds only that route's key sees no group at all —
 * SignOS listed two of its six route keys, so a member holding only
 * `sign:audit:view` had no way into the reports they were granted.
 *
 * Pinned for the SignOS and Timesheets groups only. Measured 2026-09-12, 13 of
 * the other 19 gated groups have the same gap (Workflows, HR, Recruitment,
 * Payroll, CRM, Accounting, Inventory, Delivery, Product, Support, Surveys,
 * Workspace, People, Security); they belong to their own modules.
 */
const PINNED_PRODUCTS = new Set(["sign", "timesheets"]);
const DECLARED_GROUPS: NavGroup[] = [...NAV_GROUPS, ...HOME_NAV_GROUPS].filter((group) =>
  PINNED_PRODUCTS.has(group.product),
);

function keys(gate: string | readonly string[] | undefined): string[] {
  if (gate === undefined) return [];
  return typeof gate === "string" ? [gate] : [...gate];
}

describe("a gated navigation group opens for every key its routes need", () => {
  it.each(
    DECLARED_GROUPS.filter((group) => group.requiredPermission !== undefined).map(
      (group) => [group.label, group] as const,
    ),
  )("%s", (_label, group) => {
    const groupKeys = new Set(keys(group.requiredPermission));
    const routeKeys = group.routes.flatMap((route) => [
      ...keys(route.requiredPermission),
      ...(route.children ?? []).flatMap((child) => keys(child.requiredPermission)),
    ]);
    const missing = [...new Set(routeKeys)].filter((key) => !groupKeys.has(key));

    expect(missing).toEqual([]);
  });
});
