import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsPage } from "@/features/build/settings/project-settings-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings");
  return <ProjectSettingsPage params={params} />;
}
