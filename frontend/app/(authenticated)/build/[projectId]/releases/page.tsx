import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ReleasesPage } from "@/features/build/releases/releases-page";
import { prefetchProjectReleases } from "@/lib/prefetch/build-project-extras";
import ReleasesLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function ReleasesHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectReleases(projectId);
  return (
    <HydrationBoundary state={state}>
      <ReleasesPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ReleasesRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/releases");
  const { projectId: projectIdStr } = await params;
  return (
    <Suspense fallback={<ReleasesLoading />}>
      <ReleasesHydrated projectId={Number(projectIdStr)} />
    </Suspense>
  );
}
