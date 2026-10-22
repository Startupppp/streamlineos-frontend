import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectFeedbucketPage } from "@/features/build/feedbucket/project-feedbucket-page";
import { prefetchFeedbucketWidgets } from "@/lib/prefetch/build-project-extras";
import ProjectFeedbucketLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function FeedbucketHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchFeedbucketWidgets();
  return (
    <HydrationBoundary state={state}>
      <ProjectFeedbucketPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectFeedbackRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/feedbucket");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectFeedbucketLoading />}>
      <FeedbucketHydrated projectId={Number(projectId)} />
    </Suspense>
  );
}
