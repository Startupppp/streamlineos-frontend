import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgLocationsPage } from "@/features/settings/organization/hierarchy/locations-page";
import { prefetchOrgLocations } from "@/lib/prefetch/settings";

export default async function LocationsRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgLocations();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrgLocationsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
