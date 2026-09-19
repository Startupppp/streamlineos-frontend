import type {
  NavGroup,
  NavRoute,
  PermissionRequirement,
} from "@/components/layout/sidebar/sidebar-nav-types";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { splitDestinationHref } from "./build-nav-model";
import { buildOrganizationCatalog } from "./nav/build-organization-catalog";
import {
  BUILD_BROWSE_ALL_DESTINATION,
  BUILD_MY_WORK_DESTINATIONS,
} from "./nav/build-stable-destinations";
import type {
  BuildNavDestination,
  BuildNavModel,
} from "./nav/build-nav-destination";
import type { BuildScope } from "./build-scope";

const MOBILE_PRIORITY_FALLBACK = 1_000;

function permissionKeys(
  destination: BuildNavDestination,
): PermissionKey[] {
  return Array.isArray(destination.requiredPermission)
    ? destination.requiredPermission
    : [destination.requiredPermission];
}

function unionPermission(
  destinations: BuildNavDestination[],
): PermissionRequirement | undefined {
  const keys = [...new Set(destinations.flatMap(permissionKeys))];
  return keys.length > 0 ? keys : undefined;
}

function routableDestinations(
  destinations: BuildNavDestination[],
): BuildNavDestination[] {
  const seen = new Set<string>();
  return destinations.filter((destination) => {
    const { path, view } = splitDestinationHref(destination.href);
    if (view !== null || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}

function toNavRoute(destination: BuildNavDestination): NavRoute {
  const route: NavRoute = {
    label: destination.label,
    icon: destination.icon,
    href: destination.href,
    requiredPermission: destination.requiredPermission,
  };
  return destination.exact ? { ...route, exact: true } : route;
}

function byMobilePriority(
  left: BuildNavDestination,
  right: BuildNavDestination,
): number {
  return (
    (left.mobilePriority ?? MOBILE_PRIORITY_FALLBACK) -
    (right.mobilePriority ?? MOBILE_PRIORITY_FALLBACK)
  );
}

function toNavGroup(
  label: string,
  destinations: BuildNavDestination[],
  defaultCollapsed?: boolean,
): NavGroup | null {
  const routable = routableDestinations(destinations);
  if (routable.length === 0) return null;
  const requiredPermission = unionPermission(routable);
  const group: NavGroup = {
    label,
    product: "build",
    module: "build",
    routes: routable.map(toNavRoute),
  };
  if (requiredPermission) group.requiredPermission = requiredPermission;
  if (defaultCollapsed) group.defaultCollapsed = true;
  return group;
}

export function buildOrganizationNavGroups(): NavGroup[] {
  const catalog = buildOrganizationCatalog();
  const groups: (NavGroup | null)[] = [
    toNavGroup("Build", [
      ...catalog.primary,
      ...BUILD_MY_WORK_DESTINATIONS,
      BUILD_BROWSE_ALL_DESTINATION,
    ]),
    toNavGroup(
      "Build settings",
      catalog.settings
        ? [...catalog.moreTools, catalog.settings]
        : catalog.moreTools,
      true,
    ),
  ];
  return groups.filter((group): group is NavGroup => group !== null);
}

export function toBuildNavGroups(model: BuildNavModel): NavGroup[] {
  const work = [...model.primary, ...model.myWork].sort(byMobilePriority);
  const overflow = [
    ...model.moreTools,
    ...(model.settings ? [model.settings] : []),
    ...(model.browseAll ? [model.browseAll] : []),
  ];
  const groups: (NavGroup | null)[] = [
    toNavGroup(buildScopeGroupLabel(model.scope), work),
    toNavGroup("More tools", overflow, true),
  ];
  return groups.filter((group): group is NavGroup => group !== null);
}

export function buildScopeGroupLabel(scope: BuildScope): string {
  switch (scope.type) {
    case "workspace":
      return "Workspace";
    case "product":
      return "Product";
    case "project":
      return "Project";
    default:
      return "Build";
  }
}
