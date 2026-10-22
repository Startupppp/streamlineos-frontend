import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrProbationList } from "@/lib/prefetch/hr-people";
import { ProbationPage } from "@/features/hr/onboarding/probation-page";
import ProbationLoading from "./loading";

async function ProbationHydrated() {
  const state = await prefetchHrProbationList();
  return (
    <HydrationBoundary state={state}>
      <ProbationPage />
    </HydrationBoundary>
  );
}

export default async function HrProbationRoute() {
  await requirePermission("hr:probation:view");
  return (
    <Suspense fallback={<ProbationLoading />}>
      <ProbationHydrated />
    </Suspense>
  );
}
