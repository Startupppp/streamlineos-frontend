import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectApprovalsPage } from "@/features/build/approvals/project-approvals-page";
import { prefetchProjectApprovals } from "@/lib/prefetch/build-project-extras";
import ProjectApprovalsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function ApprovalsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectApprovals(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectApprovalsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectApprovalsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/approvals");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectApprovalsLoading />}>
      <ApprovalsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
