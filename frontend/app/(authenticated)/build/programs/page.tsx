import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProgramsPage } from "@/features/build/programs/programs-page";
import { prefetchBuildPrograms } from "@/lib/prefetch/build-portfolio";
import ProgramsLoading from "./loading";

export default async function ProgramsRoute() {
  await enforceRouteAccess("/build/programs");
  const state = await prefetchBuildPrograms();
  return (
    <Suspense fallback={<ProgramsLoading />}>
      <HydrationBoundary state={state}>
        <ProgramsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
