import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MeetingsListPage } from "@/features/build/meetings/meetings-list-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectMeetingsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/meetings");
  const { projectId } = await params;
  return <MeetingsListPage projectId={parseInt(projectId, 10)} />;
}
