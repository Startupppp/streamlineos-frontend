"use client";

import { useMemo } from "react";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { usePmWorkspace } from "@/hooks/api/build/pm-workspaces";
import {
  resolveBuildScopeFallback,
  type BuildScopeFallback,
  type BuildScopeParent,
} from "@/lib/build/build-scope-fallback";
import type { BuildScope } from "@/lib/build/build-scope";

function parseParentKey(parentKey: string | null): BuildScopeParent | null {
  if (parentKey === null) return null;
  const separator = parentKey.indexOf(":");
  if (separator === -1) return null;
  const type = parentKey.slice(0, separator);
  const id = parentKey.slice(separator + 1);
  if (id.length === 0) return null;
  if (type === "product") return { type: "product", id };
  if (type === "workspace") return { type: "workspace", id };
  return null;
}

export function useBuildScopeRecovery({
  scope,
  isInaccessible,
  hasAnyBuildAccess,
  parentKey,
}: {
  scope: BuildScope;
  isInaccessible: boolean;
  hasAnyBuildAccess: boolean;
  parentKey: string | null;
}): BuildScopeFallback {
  const candidate = useMemo(
    () => (isInaccessible ? parseParentKey(parentKey) : null),
    [isInaccessible, parentKey],
  );

  const productId =
    candidate?.type === "product" ? Number(candidate.id) : Number.NaN;
  const productQuery = useManagedProduct(
    Number.isFinite(productId) ? productId : 0,
  );
  const workspaceQuery = usePmWorkspace(
    candidate?.type === "workspace" ? candidate.id : null,
  );

  const accessibleParent = useMemo<BuildScopeParent | null>(() => {
    if (candidate === null) return null;
    if (candidate.type === "product")
      return productQuery.data ? candidate : null;
    return workspaceQuery.data ? candidate : null;
  }, [candidate, productQuery.data, workspaceQuery.data]);

  return useMemo(
    () =>
      resolveBuildScopeFallback({
        scope,
        isInaccessible,
        hasAnyBuildAccess,
        accessibleParent,
      }),
    [scope, isInaccessible, hasAnyBuildAccess, accessibleParent],
  );
}
