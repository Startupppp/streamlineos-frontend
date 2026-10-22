import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { EpicsPage } from "@/features/build/epics/epics-page";
import { prefetchProjectEpics } from "@/lib/prefetch/build";
import EpicsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EpicsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/epics");
  const { projectId: projectIdStr } = await params;
  const projectId = Number(projectIdStr);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const state = await prefetchProjectEpics(projectId);
  return (
    <Suspense fallback={<EpicsLoading />}>
      <HydrationBoundary state={state}>
        <EpicsPage params={params} />
      </HydrationBoundary>
    </Suspense>
  );
}
