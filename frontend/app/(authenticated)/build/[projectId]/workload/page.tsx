import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkloadBoardPage } from "@/features/build/workload/workload-board-page";
import { prefetchProjectBoardTickets } from "@/lib/prefetch/build";
import ProjectWorkloadLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWorkloadRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/workload");
  const { projectId: projectIdStr } = await params;
  const projectId = Number(projectIdStr);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const state = await prefetchProjectBoardTickets(projectId);
  return (
    <Suspense fallback={<ProjectWorkloadLoading />}>
      <HydrationBoundary state={state}>
        <WorkloadBoardPage params={params} />
      </HydrationBoundary>
    </Suspense>
  );
}
