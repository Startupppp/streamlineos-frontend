import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrManagerCoverage } from "@/lib/prefetch/hr-people";
import { ManagerCoveragePage } from "@/features/hr/employees/manager-coverage-page";
import ManagerCoverageLoading from "./loading";

async function ManagerCoverageHydrated() {
  const state = await prefetchHrManagerCoverage();
  return (
    <HydrationBoundary state={state}>
      <ManagerCoveragePage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<ManagerCoverageLoading />}>
      <ManagerCoverageHydrated />
    </Suspense>
  );
}
