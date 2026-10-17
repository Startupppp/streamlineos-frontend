import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsIterationsPage } from "@/features/build/settings/project-settings-iterations-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Iterations — Project Settings",
};

export default async function ProjectSettingsIterationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/iterations");
  const { projectId } = await params;
  return <ProjectSettingsIterationsPage projectId={parseInt(projectId, 10)} />;
}
