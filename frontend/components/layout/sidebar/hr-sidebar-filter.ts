import type { NavGroup, NavRoute } from "./sidebar-nav-types";

function haystack(route: NavRoute): string {
  return [route.label, ...(route.searchTerms ?? [])].join(" ").toLowerCase();
}

/** A group with a single parent is shown as that parent plus its pages, not one nested row. */
export function hoistSingletonParentRoutes(routes: NavRoute[]): NavRoute[] {
  if (routes.length !== 1) return routes;
  const [sole] = routes;
  const kids = sole.children;
  if (!kids?.length) return routes;
  return [{ ...sole, children: undefined }, ...kids];
}

export function filterNavRoute(route: NavRoute, needle: string): NavRoute | null {
  if (haystack(route).includes(needle)) return route;
  if (!route.children?.length) return null;
  const children = route.children.flatMap((child) => {
    const next = filterNavRoute(child, needle);
    return next ? [next] : [];
  });
  if (children.length === 0) return null;
  return { ...route, children };
}

/** Routes in the order the HR sidebar draws them, narrowed by the find query. */
export function presentHrGroups(groups: NavGroup[], query: string): NavGroup[] {
  const needle = query.trim().toLowerCase();
  return groups.flatMap((group) => {
    const source = hoistSingletonParentRoutes(group.routes);
    if (!needle || group.label.toLowerCase().includes(needle)) {
      return [{ ...group, routes: source }];
    }
    const routes = source.flatMap((route) => {
      const next = filterNavRoute(route, needle);
      return next ? [next] : [];
    });
    if (routes.length === 0) return [];
    return [{ ...group, routes }];
  });
}
