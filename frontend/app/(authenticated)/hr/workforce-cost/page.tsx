import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrWorkforceCostSummary } from "@/lib/prefetch/hr-talent";
import { WorkforceCostPage } from "@/features/hr/workforce-cost/workforce-cost-page";
import WorkforceCostLoading from "./loading";

async function WorkforceCostHydrated() {
  await requirePermission("hr:analytics:read");
  const state = await prefetchHrWorkforceCostSummary();
  return (
    <HydrationBoundary state={state}>
      <WorkforceCostPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<WorkforceCostLoading />}>
      <WorkforceCostHydrated />
    </Suspense>
  );
}
