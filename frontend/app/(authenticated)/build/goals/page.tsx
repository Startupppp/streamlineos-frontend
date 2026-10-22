import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { GoalsPage } from "@/features/build/goals/goals-page";
import { prefetchBuildGoals } from "@/lib/prefetch/build-portfolio";
import GoalsLoading from "./loading";

export default async function Page() {
  await enforceRouteAccess("/build/goals");
  const state = await prefetchBuildGoals();
  return (
    <Suspense fallback={<GoalsLoading />}>
      <HydrationBoundary state={state}>
        <GoalsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
