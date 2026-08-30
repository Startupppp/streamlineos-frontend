import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function ProjectBoardWorkspaceRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/[projectId]");
  return <ProjectBoardPage params={params} />;
}
