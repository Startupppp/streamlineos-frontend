import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsAgentsPage } from "@/features/build/settings/project-settings-agents-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Agents — Project Settings",
};

export default async function ProjectSettingsAgentsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/agents");
  const { projectId } = await params;
  return <ProjectSettingsAgentsPage projectId={parseInt(projectId, 10)} />;
}
