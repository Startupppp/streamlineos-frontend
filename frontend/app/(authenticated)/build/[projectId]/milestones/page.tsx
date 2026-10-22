import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectMilestonesPage } from "@/features/build/milestones/project-milestones-page";
import { prefetchProjectMilestones } from "@/lib/prefetch/build";
import MilestonesLoading from "./loading";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/milestones");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchProjectMilestones(id);
  return (
    <Suspense fallback={<MilestonesLoading />}>
      <HydrationBoundary state={state}>
        <ProjectMilestonesPage projectId={projectId} />
      </HydrationBoundary>
    </Suspense>
  );
}
