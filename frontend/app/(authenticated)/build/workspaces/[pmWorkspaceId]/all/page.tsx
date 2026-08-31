import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectsPage } from "@/features/build/project-list/projects-page";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function AllProjectsWorkspaceRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/all");
  const { pmWorkspaceId } = await params;
  return <ProjectsPage pmWorkspaceId={pmWorkspaceId} />;
}
