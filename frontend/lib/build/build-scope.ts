export type BuildScopeType = "organization" | "product" | "project";

export interface BuildScope {
  type: BuildScopeType;
  managedProductId: number | null;
  projectId: number | null;
  basePath: string;
}

export const BUILD_ROOT_PATH = "/build";

const PROJECT_SEGMENT = /^\/build\/(\d+)(?:\/|$)/;
const MANAGED_PRODUCT_SEGMENT = /^\/build\/managed-products\/(\d+)(?:\/|$)/;

export const BUILD_SCOPE_TYPE_LABELS: Record<BuildScopeType, string> = {
  organization: "Organization",
  product: "Product",
  project: "Project",
};

export const ORGANIZATION_BUILD_SCOPE: BuildScope = {
  type: "organization",
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

  const productMatch = MANAGED_PRODUCT_SEGMENT.exec(pathname);
  if (productMatch) {
    const managedProductId = Number(productMatch[1]);
    return {
      type: "product",
      managedProductId,
      projectId: null,
      basePath: `${BUILD_ROOT_PATH}/managed-products/${managedProductId}`,
    };
  }

  const projectMatch = PROJECT_SEGMENT.exec(pathname);
  if (projectMatch) {
    const projectId = Number(projectMatch[1]);
    return {
      type: "project",
      managedProductId: null,
      projectId,
      basePath: `${BUILD_ROOT_PATH}/${projectId}`,
    };
  }

  return ORGANIZATION_BUILD_SCOPE;
}

export function buildScopeOverviewHref(scope: BuildScope): string {
  if (scope.type === "organization") return `${BUILD_ROOT_PATH}/command-center`;
  return scope.basePath;
}

export function buildScopeKey(scope: BuildScope): string {
  switch (scope.type) {
    case "product":
      return `product:${scope.managedProductId ?? ""}`;
    case "project":
      return `project:${scope.projectId ?? ""}`;
    default:
      return "organization";
  }
}
