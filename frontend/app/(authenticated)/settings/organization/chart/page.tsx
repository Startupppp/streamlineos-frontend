import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationChartPage } from "@/features/settings/organization/hierarchy/organization-chart-page";
import { prefetchOrgTree } from "@/lib/prefetch/settings";

export default async function OrganizationChartRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgTree();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrganizationChartPage />
      </HydrationBoundary>
    </Suspense>
  );
}
