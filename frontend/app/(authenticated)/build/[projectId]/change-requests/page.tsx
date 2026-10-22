import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ChangeRequestsPage } from "@/features/build/change-requests/change-requests-page";
import { prefetchProjectChangeRequests } from "@/lib/prefetch/build-project-extras";
import ChangeRequestsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function ChangeRequestsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectChangeRequests(projectId);
  return (
    <HydrationBoundary state={state}>
      <ChangeRequestsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ChangeRequestsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/change-requests");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  return (
    <Suspense fallback={<ChangeRequestsLoading />}>
      <ChangeRequestsHydrated projectId={projectId} />
    </Suspense>
  );
}
