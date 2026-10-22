import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { AllWorkPage } from "@/features/build/all-work/all-work-page";
import { prefetchBuildAllWork } from "@/lib/prefetch/build-portfolio";
import AllWorkLoading from "./loading";

export const metadata = {
  title: "All Work | Projects",
};

export default async function Page() {
  await enforceRouteAccess("/build/all-work");
  const state = await prefetchBuildAllWork();
  return (
    <Suspense fallback={<AllWorkLoading />}>
      <HydrationBoundary state={state}>
        <AllWorkPage />
      </HydrationBoundary>
    </Suspense>
  );
}
