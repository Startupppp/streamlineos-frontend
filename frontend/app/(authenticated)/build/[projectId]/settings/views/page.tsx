import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsViewsPage } from "@/features/build/settings/project-settings-views-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Saved Views — Project Settings",
};

export default async function ProjectSettingsViewsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/views");
  const { projectId } = await params;
  return <ProjectSettingsViewsPage projectId={parseInt(projectId, 10)} />;
}
