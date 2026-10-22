import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import { ApprovalsInboxPage } from "@/features/build/approvals/approvals-inbox-page";
import { prefetchBuildApprovals } from "@/lib/prefetch/build-portfolio";
import ApprovalsInboxLoading from "./loading";

export default async function ApprovalsInboxRoute() {
  await enforceRouteAccess("/build/approvals");
  const state = await prefetchBuildApprovals();
  return (
    <Suspense fallback={<ApprovalsInboxLoading />}>
      <HydrationBoundary state={state}>
        <RequireModule module="build">
          <ApprovalsInboxPage />
        </RequireModule>
      </HydrationBoundary>
    </Suspense>
  );
}
