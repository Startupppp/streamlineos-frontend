import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgBranchesPage } from "@/features/settings/organization/hierarchy/branches-page";
import { prefetchOrgBranches } from "@/lib/prefetch/settings";

export default async function BranchesRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgBranches();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrgBranchesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
