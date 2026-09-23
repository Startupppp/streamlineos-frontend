"use client";

import { useCallback, useMemo } from "react";
import { useAccess } from "@/hooks/api/access";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { resolveBuildNavModel } from "@/lib/build/build-nav-model";
import type {
  BuildNavAccess,
  BuildNavModel,
} from "@/lib/build/nav/build-nav-destination";
import {
  resolveBuildScopeFallback,
  type BuildScopeFallback,
  type BuildScopeParent,
} from "@/lib/build/build-scope-fallback";
import { ORGANIZATION_BUILD_SCOPE, type BuildScope } from "@/lib/build/build-scope";
import type { PermissionKey } from "@/lib/rbac/permissions";

function firstAuthorizedOrganizationHref(model: BuildNavModel): string | null {
  return (
    model.myWork[0]?.href ??
    model.primary[0]?.href ??
    model.moreTools[0]?.href ??
    model.settings?.href ??
    null
  );
}

function parseParentKey(parentKey: string | null): BuildScopeParent | null {
  if (parentKey === null) return null;
  const separator = parentKey.indexOf(":");
  if (separator === -1) return null;
  const type = parentKey.slice(0, separator);
  const id = parentKey.slice(separator + 1);
  if (id.length === 0) return null;
  if (type === "product") return { type: "product", id };
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

  const accessibleParent = useMemo<BuildScopeParent | null>(() => {
    if (candidate === null) return null;
    return productQuery.data ? candidate : null;
  }, [candidate, productQuery.data]);

  const { data: access } = useAccess();
  const isOrgOwner = access?.isOrgOwner === true;
  const scopes = access?.scopes;

  const canAtOrganization = useCallback(
    (permission: PermissionKey) =>
      isOrgOwner || (scopes !== undefined && permission in scopes),
    [isOrgOwner, scopes],
  );

  const organizationNavAccess = useMemo<BuildNavAccess>(
    () => ({
      can: canAtOrganization,
      isOrgModuleEnabled: () => true,
      isCapabilityEnabled: () => true,
    }),
    [canAtOrganization],
  );

  const organizationHref = useMemo(() => {
    if (access === undefined) return null;
    const organizationModel = resolveBuildNavModel({
      scope: ORGANIZATION_BUILD_SCOPE,
      access: organizationNavAccess,
      pinnedIds: [],
    });
    return firstAuthorizedOrganizationHref(organizationModel);
  }, [access, organizationNavAccess]);

  return useMemo(
    () =>
      resolveBuildScopeFallback({
        scope,
        isInaccessible,
        hasAnyBuildAccess,
        accessibleParent,
        organizationHref,
      }),
    [scope, isInaccessible, hasAnyBuildAccess, accessibleParent, organizationHref],
  );
}
