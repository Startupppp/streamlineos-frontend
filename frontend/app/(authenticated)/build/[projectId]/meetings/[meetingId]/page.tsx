import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MeetingDetailPage } from "@/features/build/meetings/meeting-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; meetingId: string }>;
}

export default async function ProjectMeetingDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/meetings/[meetingId]");
  const { projectId, meetingId } = await params;
  return (
    <MeetingDetailPage
      projectId={parseInt(projectId, 10)}
      meetingId={parseInt(meetingId, 10)}
    />
  );
}
