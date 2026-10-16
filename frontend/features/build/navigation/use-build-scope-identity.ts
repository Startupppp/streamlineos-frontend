"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { isApiError } from "@/lib/api-client";
import { useProject } from "@/hooks/api/build/projects";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { useGetOrganizations } from "@/hooks/common/auth-hooks";
import {
  buildScopeKey,
  buildScopeOverviewHref,
  type BuildScope,
} from "@/lib/build/build-scope";
import {
  useBuildScopeRecents,
  useBuildScopeStars,
} from "./use-build-nav-preferences";
import type { BuildScopeRef } from "./build-nav-storage";
import { ORGANIZATION_SCOPE_REF } from "./use-build-scope-directory";

export interface BuildScopeIdentity {
  ref: BuildScopeRef;
  isLoading: boolean;
  isArchived: boolean;
  isInaccessible: boolean;
}

// A scope in another tenant (or deleted) is a 404, not a 403 (BE-22); both
// mean the actor cannot use it, so neither may keep a remembered name (MP-B-021).
function isMissingAccess(error: unknown): boolean {
  return isApiError(error) && (error.status === 403 || error.status === 404);
}

export function useBuildScopeIdentity(scope: BuildScope): BuildScopeIdentity {
  const { recents } = useBuildScopeRecents();
  const { starred } = useBuildScopeStars();
  const { data: session } = useSession();
  const { data: organizations } = useGetOrganizations();

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
            name: projectQuery.data?.name ?? (isMissingAccess(projectQuery.error) ? "" : base.name),
            projectKey: projectQuery.data?.key ?? base.projectKey,
          },
          isLoading: projectQuery.isLoading,
          isArchived: projectQuery.data?.status === "ARCHIVED",
          isInaccessible: isMissingAccess(projectQuery.error),
        };
      case "product":
        return {
          ref: {
            ...base,
            id: String(scope.managedProductId ?? ""),
            name: productQuery.data?.name ?? (isMissingAccess(productQuery.error) ? "" : base.name),
            projectKey: productQuery.data?.key ?? base.projectKey,
          },
          isLoading: productQuery.isLoading,
          isArchived: productQuery.data?.status === "archived",
          isInaccessible: isMissingAccess(productQuery.error),
        };
      default: {
        const orgId = session?.orgId as string | undefined;
        const activeOrg =
          organizations?.find((o) => o.id === orgId) ?? organizations?.[0];
        return {
          ref: { ...ORGANIZATION_SCOPE_REF, name: activeOrg?.name ?? ORGANIZATION_SCOPE_REF.name },
          isLoading: organizations === undefined,
          isArchived: false,
          isInaccessible: false,
        };
      }
    }
  }, [scope, scopeKey, known, projectQuery, productQuery, session, organizations]);
}
