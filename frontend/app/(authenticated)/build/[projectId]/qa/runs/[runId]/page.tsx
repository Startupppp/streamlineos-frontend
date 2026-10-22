import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RunExecutionPage } from "@/features/build/qa/runs/run-execution-page";
import { prefetchTestRunDetail } from "@/lib/prefetch/build-project-extras";
import RunExecutionLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; runId: string }>;
}

async function RunDetailHydrated({ projectId, runId }: { projectId: number; runId: number }) {
  const state = await prefetchTestRunDetail(projectId, runId);
  return (
    <HydrationBoundary state={state}>
      <RunExecutionPage projectId={projectId} runId={runId} />
    </HydrationBoundary>
  );
}

export default async function RunExecutionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/qa/runs/[runId]");
  const { projectId: projectIdStr, runId: runIdStr } = await params;
  return (
    <Suspense fallback={<RunExecutionLoading />}>
      <RunDetailHydrated projectId={parseInt(projectIdStr, 10)} runId={parseInt(runIdStr, 10)} />
    </Suspense>
  );
}
