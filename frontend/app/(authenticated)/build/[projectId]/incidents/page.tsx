import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IncidentsPage } from "@/features/build/incidents/incidents-page";
import { prefetchProjectIncidents } from "@/lib/prefetch/build-project-extras";
import IncidentsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function IncidentsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectIncidents(projectId);
  return (
    <HydrationBoundary state={state}>
      <IncidentsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function IncidentsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/incidents");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  return (
    <Suspense fallback={<IncidentsLoading />}>
      <IncidentsHydrated projectId={projectId} />
    </Suspense>
  );
}
