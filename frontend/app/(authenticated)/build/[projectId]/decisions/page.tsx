import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { DecisionsPage } from "@/features/build/governance/decisions-page";
import { prefetchProjectDecisions } from "@/lib/prefetch/build-project-extras";
import ProjectDecisionsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function DecisionsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectDecisions(projectId);
  return (
    <HydrationBoundary state={state}>
      <DecisionsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectDecisionsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/decisions");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectDecisionsLoading />}>
      <DecisionsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
