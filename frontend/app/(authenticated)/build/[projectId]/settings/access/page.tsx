import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsAccessPage } from "@/features/build/settings/project-settings-access-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Access — Project Settings",
};

export default async function ProjectSettingsAccessRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/access");
  const { projectId } = await params;
  return <ProjectSettingsAccessPage projectId={parseInt(projectId, 10)} />;
}
