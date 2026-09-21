import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RunExecutionPage } from "@/features/build/qa/runs/run-execution-page";

interface PageProps {
  params: Promise<{ projectId: string; runId: string }>;
}

export default async function RunExecutionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/qa/runs/[runId]");
  const { projectId: projectIdStr, runId: runIdStr } = await params;
  return (
    <RunExecutionPage
      projectId={parseInt(projectIdStr, 10)}
      runId={parseInt(runIdStr, 10)}
    />
  );
}
