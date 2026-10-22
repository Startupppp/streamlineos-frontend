import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBacklogPage } from "@/features/build/backlog/project-backlog-page";
import { prefetchProjectBoardTickets } from "@/lib/prefetch/build";
import BacklogLoading from "./loading";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/backlog");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchProjectBoardTickets(id);
  return (
    <Suspense fallback={<BacklogLoading />}>
      <HydrationBoundary state={state}>
        <ProjectBacklogPage projectId={projectId} />
      </HydrationBoundary>
    </Suspense>
  );
}
