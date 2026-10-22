import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MeetingsListPage } from "@/features/build/meetings/meetings-list-page";
import { prefetchProjectMeetings } from "@/lib/prefetch/build-project-extras";
import MeetingsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function MeetingsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectMeetings(projectId);
  return (
    <HydrationBoundary state={state}>
      <MeetingsListPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectMeetingsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/meetings");
  const { projectId } = await params;
  return (
    <Suspense fallback={<MeetingsLoading />}>
      <MeetingsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
