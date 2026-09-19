import {
  parsePmWorkspaceIdFromPath,
  stripPmWorkspacePrefix,
} from "./pm-workspace-path";

export type BuildScopeType =
  | "organization"
  | "workspace"
  | "product"
  | "project";

export interface BuildScope {
  type: BuildScopeType;
  pmWorkspaceId: string | null;
  managedProductId: number | null;
  projectId: number | null;
  basePath: string;
}

export const BUILD_ROOT_PATH = "/build";

const PROJECT_SEGMENT = /^\/build\/(\d+)(?:\/|$)/;
const MANAGED_PRODUCT_SEGMENT = /^\/build\/managed-products\/(\d+)(?:\/|$)/;

export const BUILD_SCOPE_TYPE_LABELS: Record<BuildScopeType, string> = {
  organization: "Organization",
  workspace: "Workspace",
  product: "Product",
  project: "Project",
};

export const ORGANIZATION_BUILD_SCOPE: BuildScope = {
  type: "organization",
  pmWorkspaceId: null,
  managedProductId: null,
  projectId: null,
  basePath: BUILD_ROOT_PATH,
};

export function isBuildPath(pathname: string): boolean {
  return (
    pathname === BUILD_ROOT_PATH ||
    pathname.startsWith(`${BUILD_ROOT_PATH}/`)
  );
}

export function resolveBuildScope(pathname: string): BuildScope {
  if (!isBuildPath(pathname)) return ORGANIZATION_BUILD_SCOPE;

  const pmWorkspaceId = parsePmWorkspaceIdFromPath(pathname);
  const withoutWorkspace = stripPmWorkspacePrefix(pathname);

  const productMatch = MANAGED_PRODUCT_SEGMENT.exec(withoutWorkspace);
  if (productMatch) {
    const managedProductId = Number(productMatch[1]);
    return {
      type: "product",
      pmWorkspaceId,
      managedProductId,
      projectId: null,
      basePath: `${BUILD_ROOT_PATH}/managed-products/${managedProductId}`,
    };
  }

  const projectMatch = PROJECT_SEGMENT.exec(withoutWorkspace);
  if (projectMatch) {
    const projectId = Number(projectMatch[1]);
    return {
      type: "project",
      pmWorkspaceId,
      managedProductId: null,
      projectId,
      basePath: `${BUILD_ROOT_PATH}/${projectId}`,
    };
  }

  if (pmWorkspaceId) {
    return {
      type: "workspace",
      pmWorkspaceId,
      managedProductId: null,
      projectId: null,
      basePath: `${BUILD_ROOT_PATH}/workspaces/${pmWorkspaceId}`,
    };
  }

  return ORGANIZATION_BUILD_SCOPE;
}

export function buildScopeOverviewHref(scope: BuildScope): string {
  return scope.type === "organization"
    ? `${BUILD_ROOT_PATH}/command-center`
    : scope.basePath;
}

export function buildScopeKey(scope: BuildScope): string {
  switch (scope.type) {
    case "workspace":
      return `workspace:${scope.pmWorkspaceId ?? ""}`;
    case "product":
      return `product:${scope.managedProductId ?? ""}`;
    case "project":
      return `project:${scope.projectId ?? ""}`;
    default:
      return "organization";
  }
}

export function isSameBuildScope(left: BuildScope, right: BuildScope): boolean {
  return buildScopeKey(left) === buildScopeKey(right);
}
