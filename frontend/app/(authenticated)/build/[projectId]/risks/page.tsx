import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RisksPage } from "@/features/build/governance/risks-page";
import { prefetchProjectRisks } from "@/lib/prefetch/build-project-extras";
import ProjectRisksLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function RisksHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectRisks(projectId);
  return (
    <HydrationBoundary state={state}>
      <RisksPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectRisksRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/risks");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectRisksLoading />}>
      <RisksHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
