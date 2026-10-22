import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { NAV_GROUPS } from "./sidebar-nav-items";
import type { NavGroup } from "./sidebar-nav-types";

const PINNED_PRODUCTS = new Set(["sign", "timesheets"]);
const DECLARED_GROUPS: NavGroup[] = [...NAV_GROUPS, ...HOME_NAV_GROUPS].filter((group) =>
  PINNED_PRODUCTS.has(group.module),
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
