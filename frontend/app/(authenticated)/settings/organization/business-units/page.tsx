import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { BusinessUnitsPage } from "@/features/settings/organization/hierarchy/business-units-page";
import { prefetchBusinessUnits } from "@/lib/prefetch/settings";

export default async function BusinessUnitsRoute() {
  await requirePermission("settings:view");
  const state = await prefetchBusinessUnits();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <BusinessUnitsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
