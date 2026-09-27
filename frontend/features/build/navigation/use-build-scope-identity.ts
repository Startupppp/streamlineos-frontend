"use client";

import { useMemo } from "react";
import { isApiError } from "@/lib/api-client";
import { useProject } from "@/hooks/api/build/projects";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import {
  buildScopeKey,
  buildScopeOverviewHref,
  type BuildScope,
} from "@/lib/build/build-scope";
import type { ManagedProduct } from "@/types/projects/managed-products";
import {
  useBuildScopeRecents,
  useBuildScopeStars,
  type BuildScopeRef,
} from "./use-build-nav-preferences";
import { ORGANIZATION_SCOPE_REF } from "./use-build-scope-directory";

export interface BuildScopeIdentity {
  ref: BuildScopeRef;
  isLoading: boolean;
  isArchived: boolean;
  isInaccessible: boolean;
}

function isMissingAccess(error: unknown): boolean {
  return isApiError(error) && (error.status === 403 || error.status === 404);
}

export function useBuildScopeIdentity(scope: BuildScope): BuildScopeIdentity {
  const { recents } = useBuildScopeRecents();
  const { starred } = useBuildScopeStars();

  const projectQuery = useProject(scope.projectId ?? 0);
  const productQuery = useManagedProduct(scope.managedProductId ?? 0, {
    throwOnError: false,
  });

  const scopeKey = buildScopeKey(scope);
  const known = useMemo(
    () =>
      [...recents, ...starred].find((entry) => entry.key === scopeKey) ?? null,
    [recents, starred, scopeKey],
  );

  return useMemo<BuildScopeIdentity>(() => {
    const href = buildScopeOverviewHref(scope);
    const base: BuildScopeRef = {
      key: scopeKey,
      type: scope.type,
      id: scopeKey,
      name: known?.name ?? "",
      parentPath: known?.parentPath ?? null,
      parentKey: known?.parentKey ?? null,
      projectKey: known?.projectKey ?? null,
      href,
    };

    switch (scope.type) {
      case "project":
        return {
          ref: {
            ...base,
            id: String(scope.projectId ?? ""),
            name: projectQuery.data?.name ?? (base.name || "Project"),
            projectKey: projectQuery.data?.key ?? base.projectKey,
          },
          isLoading: projectQuery.isLoading,
          isArchived: projectQuery.data?.status === "ARCHIVED",
          isInaccessible: isMissingAccess(projectQuery.error),
        };
      case "product": {
        const product: ManagedProduct | null | undefined = productQuery.data;
        return {
          ref: {
            ...base,
            id: String(scope.managedProductId ?? ""),
            name: product?.name ?? (base.name || "Product"),
            projectKey: product?.key ?? base.projectKey,
          },
          isLoading: productQuery.isLoading,
          isArchived: product?.status === "archived",
          isInaccessible: isMissingAccess(productQuery.error),
        };
      }
      default:
        return {
          ref: ORGANIZATION_SCOPE_REF,
          isLoading: false,
          isArchived: false,
          isInaccessible: false,
        };
    }
  }, [scope, scopeKey, known, projectQuery, productQuery]);
}
