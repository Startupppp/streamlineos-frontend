import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MeetingDetailPage } from "@/features/build/meetings/meeting-detail-page";
import { prefetchMeetingDetail } from "@/lib/prefetch/build-project-extras";
import MeetingDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; meetingId: string }>;
}

async function MeetingDetailHydrated({ projectId, meetingId }: { projectId: number; meetingId: number }) {
  const state = await prefetchMeetingDetail(projectId, meetingId);
  return (
    <HydrationBoundary state={state}>
      <MeetingDetailPage projectId={projectId} meetingId={meetingId} />
    </HydrationBoundary>
  );
}

export default async function ProjectMeetingDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/meetings/[meetingId]");
  const { projectId, meetingId } = await params;
  return (
    <Suspense fallback={<MeetingDetailLoading />}>
      <MeetingDetailHydrated projectId={parseInt(projectId, 10)} meetingId={parseInt(meetingId, 10)} />
    </Suspense>
  );
}
