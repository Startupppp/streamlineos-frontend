import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CommandCenterPage } from "@/features/build/command-center/command-center-page";
import { prefetchBuildCommandCenter } from "@/lib/prefetch/build-portfolio";
import CommandCenterLoading from "./loading";

export default async function CommandCenterRoute() {
  await enforceRouteAccess("/build/command-center");
  const state = await prefetchBuildCommandCenter();
  return (
    <Suspense fallback={<CommandCenterLoading />}>
      <HydrationBoundary state={state}>
        <CommandCenterPage />
      </HydrationBoundary>
    </Suspense>
  );
}
