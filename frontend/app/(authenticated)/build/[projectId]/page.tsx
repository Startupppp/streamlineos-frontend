import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectOverviewPage } from "@/features/build/overview/project-overview-page";
import { prefetchProjectMilestones } from "@/lib/prefetch/build";
import ProjectBoardLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchProjectMilestones(id);
  return (
    <Suspense fallback={<ProjectBoardLoading />}>
      <HydrationBoundary state={state}>
        <ProjectOverviewPage projectId={id} />
      </HydrationBoundary>
    </Suspense>
  );
}
