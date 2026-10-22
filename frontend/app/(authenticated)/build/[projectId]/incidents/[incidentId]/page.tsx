import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IncidentDetailPage } from "@/features/build/incidents/incident-detail-page";
import { prefetchIncidentDetail } from "@/lib/prefetch/build-project-extras";
import IncidentDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; incidentId: string }>;
}

async function IncidentDetailHydrated({ projectId, incidentId }: { projectId: number; incidentId: number }) {
  const state = await prefetchIncidentDetail(projectId, incidentId);
  return (
    <HydrationBoundary state={state}>
      <IncidentDetailPage projectId={projectId} incidentId={incidentId} />
    </HydrationBoundary>
  );
}

export default async function IncidentDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/incidents/[incidentId]");
  const { projectId, incidentId } = await params;
  return (
    <Suspense fallback={<IncidentDetailLoading />}>
      <IncidentDetailHydrated projectId={parseInt(projectId, 10)} incidentId={parseInt(incidentId, 10)} />
    </Suspense>
  );
}
