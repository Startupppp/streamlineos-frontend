import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsIntegrationsPage } from "@/features/build/settings/project-settings-integrations-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Integrations — Project Settings",
};

export default async function ProjectSettingsIntegrationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/integrations");
  const { projectId } = await params;
  return <ProjectSettingsIntegrationsPage projectId={parseInt(projectId, 10)} />;
}
