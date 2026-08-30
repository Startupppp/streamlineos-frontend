import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsPage } from "@/features/build/settings/project-settings-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function ProjectSettingsWorkspaceRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/[projectId]/settings");
  return <ProjectSettingsPage params={params} />;
}
