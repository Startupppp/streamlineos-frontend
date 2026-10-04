import { buildOrganizationCatalog } from "@/lib/build/nav/build-organization-catalog";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";
import {
  BUILD_MY_WORK_DESTINATIONS,
  BUILD_BROWSE_ALL_DESTINATION,
} from "@/lib/build/nav/build-stable-destinations";

export interface BuildCapabilityEntry {
  routeId: string;
  permissionKeys: readonly string[];
}

function toPermissionKeys(
  perm: string | readonly string[],
): readonly string[] {
  return Array.isArray(perm) ? perm : [perm];
}

function destToEntry(dest: BuildNavDestination): BuildCapabilityEntry {
  return {
    routeId: dest.id,
    permissionKeys: toPermissionKeys(dest.requiredPermission),
  };
}

function buildRegistryEntries(): readonly BuildCapabilityEntry[] {
  const orgCatalog = buildOrganizationCatalog();
  const stableDestinations = [
    ...BUILD_MY_WORK_DESTINATIONS,
    BUILD_BROWSE_ALL_DESTINATION,
  ];
  return [
    ...orgCatalog.primary,
    ...(orgCatalog.moreTools ?? []),
    ...stableDestinations,
  ].map(destToEntry);
}

export const BUILD_CAPABILITY_REGISTRY: readonly BuildCapabilityEntry[] =
  buildRegistryEntries();

export function findBuildCapability(
  routeId: string,
): BuildCapabilityEntry | undefined {
  return BUILD_CAPABILITY_REGISTRY.find((e) => e.routeId === routeId);
}

export function authorizedBuildRouteIds(
  can: (key: string) => boolean,
): readonly string[] {
  return BUILD_CAPABILITY_REGISTRY.filter((entry) =>
    entry.permissionKeys.some(can),
  ).map((entry) => entry.routeId);
}
