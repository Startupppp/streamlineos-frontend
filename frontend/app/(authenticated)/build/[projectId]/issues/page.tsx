import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";
import { prefetchProjectBoardTickets } from "@/lib/prefetch/build";
import IssuesLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectIssuesRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/issues");
  const { projectId: projectIdStr } = await params;
  const projectId = Number(projectIdStr);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const state = await prefetchProjectBoardTickets(projectId);
  return (
    <Suspense fallback={<IssuesLoading />}>
      <HydrationBoundary state={state}>
        <ProjectBoardPage params={params} />
      </HydrationBoundary>
    </Suspense>
  );
}
