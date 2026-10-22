import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import { MyWorkPage } from "@/features/build/my-work/my-work-page";
import { prefetchBuildMyWork } from "@/lib/prefetch/build-portfolio";
import MyWorkLoading from "./loading";

export default async function MyWorkRoute() {
  await enforceRouteAccess("/build/my-work");
  const state = await prefetchBuildMyWork();
  return (
    <Suspense fallback={<MyWorkLoading />}>
      <HydrationBoundary state={state}>
        <RequireModule module="build">
          <MyWorkPage />
        </RequireModule>
      </HydrationBoundary>
    </Suspense>
  );
}
