import type { BuildScope } from "./build-scope";

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
  if (accessibleParent?.type === "product")
    return {
      kind: "recover",
      href: `/build/managed-products/${accessibleParent.id}`,
      label: "Go to product",
    };
  if (organizationHref !== null)
    return {
      kind: "recover",
      href: organizationHref,
      label: "Go to All of Build",
    };
  return { kind: "no-access" };
}
