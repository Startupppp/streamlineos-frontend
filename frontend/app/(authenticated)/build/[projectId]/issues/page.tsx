import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectIssuesRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/issues");
  return <ProjectBoardPage params={params} />;
}
