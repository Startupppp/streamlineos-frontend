import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgCostCentersPage } from "@/features/settings/organization/hierarchy/cost-centers-page";
import { prefetchOrgCostCenters } from "@/lib/prefetch/settings";

export default async function CostCentersRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgCostCenters();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrgCostCentersPage />
      </HydrationBoundary>
    </Suspense>
  );
}
