import { BUILD_ROOT_PATH, type BuildScope } from "./build-scope";

export type BuildScopeFallback =
  | { kind: "stay" }
  | { kind: "recover"; href: string; label: string }
  | { kind: "no-access" };

export interface BuildScopeFallbackInput {
  scope: BuildScope;
  isInaccessible: boolean;
  hasAnyBuildAccess: boolean;
  accessibleParent: BuildScopeParent | null;
  organizationHref: string | null;
}

export interface BuildScopeParent {
  type: "product";
  id: string;
}

function parentHref(parent: BuildScopeParent): string {
  return `${BUILD_ROOT_PATH}/managed-products/${parent.id}`;
}

function parentLabel(_parent: BuildScopeParent): string {
  return "Go to the parent product";
}

export function resolveBuildScopeFallback({
  scope,
  isInaccessible,
  hasAnyBuildAccess,
  accessibleParent,
  organizationHref,
}: BuildScopeFallbackInput): BuildScopeFallback {
  if (!isInaccessible) return { kind: "stay" };
  if (scope.type === "organization")
    return hasAnyBuildAccess ? { kind: "stay" } : { kind: "no-access" };
  if (!hasAnyBuildAccess) return { kind: "no-access" };
  if (accessibleParent !== null)
    return {
      kind: "recover",
      href: parentHref(accessibleParent),
      label: parentLabel(accessibleParent),
    };
  if (organizationHref !== null)
    return {
      kind: "recover",
      href: organizationHref,
      label: "Go to All of Build",
    };
  return { kind: "no-access" };
}
