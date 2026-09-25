import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsFieldsPage } from "@/features/build/settings/project-settings-fields-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Custom Fields — Project Settings",
};

export default async function ProjectSettingsFieldsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/fields");
  const { projectId } = await params;
  return <ProjectSettingsFieldsPage projectId={parseInt(projectId, 10)} />;
}
