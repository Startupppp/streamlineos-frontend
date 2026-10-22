import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TeamsListPage } from "@/features/build/teams/teams-list-page";
import { prefetchBuildTeams } from "@/lib/prefetch/build-portfolio";
import TeamsLoading from "./loading";

export default async function TeamsRoute() {
  await enforceRouteAccess("/build/teams");
  const state = await prefetchBuildTeams();
  return (
    <Suspense fallback={<TeamsLoading />}>
      <HydrationBoundary state={state}>
        <TeamsListPage />
      </HydrationBoundary>
    </Suspense>
  );
}
