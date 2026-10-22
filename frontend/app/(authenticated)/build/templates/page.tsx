import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BuildTemplatesPage } from "@/features/build/templates/build-templates-page";
import { prefetchBuildTemplates } from "@/lib/prefetch/build-portfolio";
import TemplatesLoading from "./loading";

export default async function Page() {
  await enforceRouteAccess("/build/templates");
  const state = await prefetchBuildTemplates();
  return (
    <Suspense fallback={<TemplatesLoading />}>
      <HydrationBoundary state={state}>
        <BuildTemplatesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
