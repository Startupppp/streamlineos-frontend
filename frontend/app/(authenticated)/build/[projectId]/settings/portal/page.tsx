import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsPortalPage } from "@/features/build/settings/project-settings-portal-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Portal — Project Settings",
};

export default async function ProjectSettingsPortalRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/portal");
  const { projectId } = await params;
  return <ProjectSettingsPortalPage projectId={parseInt(projectId, 10)} />;
}
