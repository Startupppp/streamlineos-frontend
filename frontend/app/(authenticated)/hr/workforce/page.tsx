import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrWorkforcePlans } from "@/lib/prefetch/hr-talent";
import { WorkforcePlanningPage } from "@/features/hr/workforce";
import HrWorkforceLoading from "./loading";

async function WorkforceHydrated() {
  await requirePermission("hr:analytics:read");
  const state = await prefetchHrWorkforcePlans();
  return (
    <HydrationBoundary state={state}>
      <WorkforcePlanningPage />
    </HydrationBoundary>
  );
}

export default function HrWorkforcePage() {
  return (
    <Suspense fallback={<HrWorkforceLoading />}>
      <WorkforceHydrated />
    </Suspense>
  );
}
