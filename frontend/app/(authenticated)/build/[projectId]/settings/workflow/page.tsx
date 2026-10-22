import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkflowPage } from "@/features/build/workflow/workflow-page";
import { prefetchProjectWorkflow } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsWorkflowLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function WorkflowHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectWorkflow(projectId);
  return (
    <HydrationBoundary state={state}>
      <WorkflowPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsWorkflowRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/workflow");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsWorkflowLoading />}>
      <WorkflowHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
