import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RoadmapListPage } from "@/features/build/roadmap/roadmap-list-page";
import { prefetchBuildRoadmap } from "@/lib/prefetch/build-portfolio";
import RoadmapLoading from "./loading";

export default async function Page() {
  await enforceRouteAccess("/build/roadmap");
  const state = await prefetchBuildRoadmap();
  return (
    <Suspense fallback={<RoadmapLoading />}>
      <HydrationBoundary state={state}>
        <RoadmapListPage />
      </HydrationBoundary>
    </Suspense>
  );
}
