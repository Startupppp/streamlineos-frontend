import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectTimelinePage } from "@/features/build/timeline/project-timeline-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TimelinePage({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/timeline");
  const { projectId: projectIdStr } = await params;
  return <ProjectTimelinePage projectId={parseInt(projectIdStr, 10)} />;
}
