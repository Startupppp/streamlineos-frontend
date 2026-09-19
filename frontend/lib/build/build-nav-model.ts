import type { BuildScope } from "./build-scope";
import {
  BUILD_NAV_MAX_PINS,
  BUILD_NAV_MAX_PRIMARY,
  type BuildCreateAction,
  type BuildNavAccess,
  type BuildNavDestination,
  type BuildNavModel,
  type BuildNavModelInput,
  type BuildScopeCatalog,
} from "./nav/build-nav-destination";
import {
  BUILD_BROWSE_ALL_DESTINATION,
  BUILD_MY_WORK_DESTINATIONS,
} from "./nav/build-stable-destinations";
import { buildOrganizationCatalog } from "./nav/build-organization-catalog";
import { buildWorkspaceCatalog } from "./nav/build-workspace-catalog";
import { buildManagedProductCatalog } from "./nav/build-managed-product-catalog";
import { buildProjectCatalog } from "./nav/build-project-catalog";

const WORK_BOARD_VIEWS: ReadonlySet<string> = new Set([
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
]);

export function buildScopeCatalog(scope: BuildScope): BuildScopeCatalog {
  switch (scope.type) {
    case "workspace":
      return buildWorkspaceCatalog(scope.basePath);
    case "product":
      return buildManagedProductCatalog(scope.basePath);
    case "project":
      return buildProjectCatalog(scope.basePath);
    case "organization":
      return buildOrganizationCatalog();
  }
}

function isPermitted(
  destination: BuildNavDestination,
  access: BuildNavAccess,
): boolean {
  if (
    destination.requiredOrgModule !== undefined &&
    !access.isOrgModuleEnabled(destination.requiredOrgModule)
  )
    return false;
  if (
    destination.requiredCapability !== undefined &&
    !access.isCapabilityEnabled(destination.requiredCapability)
  )
    return false;
  const required = destination.requiredPermission;
  const keys = Array.isArray(required) ? required : [required];
  return keys.some((key) => access.can(key));
}

function permitted(
  destinations: BuildNavDestination[],
  access: BuildNavAccess,
): BuildNavDestination[] {
  return destinations.filter((destination) => isPermitted(destination, access));
}

function createActionsFor(
  scope: BuildScope,
  access: BuildNavAccess,
): BuildCreateAction[] {
  const actions: BuildCreateAction[] = [
    { id: "issue", label: "Issue", requiredPermission: "build:tickets:create" },
    { id: "project", label: "Project", requiredPermission: "build:create" },
  ];
  if (scope.type !== "project")
    actions.push({
      id: "managed-product",
      label: "Product",
      requiredPermission: "build:managed-products:create",
    });
  return actions.filter((action) => access.can(action.requiredPermission));
}

export function resolveBuildNavModel({
  scope,
  access,
  pinnedIds,
}: BuildNavModelInput): BuildNavModel {
  const catalog = buildScopeCatalog(scope);
  const primary = permitted(catalog.primary, access).slice(
    0,
    BUILD_NAV_MAX_PRIMARY,
  );
  const moreTools = permitted(catalog.moreTools, access);
  const settings =
    catalog.settings && isPermitted(catalog.settings, access)
      ? catalog.settings
      : null;
  const pinnedOrder = new Map(pinnedIds.map((id, index) => [id, index]));
  const pinned = moreTools
    .filter((destination) => pinnedOrder.has(destination.id))
    .sort(
      (left, right) =>
        (pinnedOrder.get(left.id) ?? 0) - (pinnedOrder.get(right.id) ?? 0),
    )
    .slice(0, BUILD_NAV_MAX_PINS);

  return {
    scope,
    myWork: permitted(BUILD_MY_WORK_DESTINATIONS, access),
    primary,
    pinned,
    moreTools,
    settings,
    browseAll: isPermitted(BUILD_BROWSE_ALL_DESTINATION, access)
      ? BUILD_BROWSE_ALL_DESTINATION
      : null,
    createActions: createActionsFor(scope, access),
  };
}

export function resolveAuthorizedToolIds(
  scope: BuildScope,
  access: BuildNavAccess,
): string[] {
  return permitted(buildScopeCatalog(scope).moreTools, access).map(
    (destination) => destination.id,
  );
}

export function countBuildScopePins(
  storedIds: readonly string[],
  authorizedToolIds: readonly string[],
): number {
  const authorized = new Set(authorizedToolIds);
  return storedIds.filter((id) => authorized.has(id)).length;
}

export function isBuildNavModelEmpty(model: BuildNavModel): boolean {
  return (
    model.primary.length === 0 &&
    model.myWork.length === 0 &&
    model.moreTools.length === 0 &&
    model.settings === null
  );
}

export function splitDestinationHref(href: string): {
  path: string;
  view: string | null;
} {
  const separator = href.indexOf("?");
  if (separator === -1) return { path: href, view: null };
  return {
    path: href.slice(0, separator),
    view: new URLSearchParams(href.slice(separator + 1)).get("view"),
  };
}

export function isBuildDestinationActive(
  destination: BuildNavDestination,
  pathname: string,
  view: string | null,
): boolean {
  const { path, view: expectedView } = splitDestinationHref(destination.href);
  if (expectedView !== null) return pathname === path && view === expectedView;
  if (destination.exact) {
    if (pathname !== path) return false;
    if (!destination.boardViews) return true;
    return view === null || WORK_BOARD_VIEWS.has(view);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
