import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TriagePage } from "@/features/build/triage/triage-page";
import { prefetchProjectBoardTickets } from "@/lib/prefetch/build";
import TriageLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTriagePage({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/triage");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId) || projectId <= 0) notFound();
  const state = await prefetchProjectBoardTickets(projectId);
  return (
    <Suspense fallback={<TriageLoading />}>
      <HydrationBoundary state={state}>
        <TriagePage projectId={projectId} />
      </HydrationBoundary>
    </Suspense>
  );
}
