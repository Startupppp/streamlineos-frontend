import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PortfoliosPage } from "@/features/build/portfolios/portfolios-page";
import { prefetchBuildPortfolios } from "@/lib/prefetch/build-portfolio";
import PortfoliosLoading from "./loading";

export default async function PortfoliosRoute() {
  await enforceRouteAccess("/build/portfolios");
  const state = await prefetchBuildPortfolios();
  return (
    <Suspense fallback={<PortfoliosLoading />}>
      <HydrationBoundary state={state}>
        <PortfoliosPage />
      </HydrationBoundary>
    </Suspense>
  );
}
