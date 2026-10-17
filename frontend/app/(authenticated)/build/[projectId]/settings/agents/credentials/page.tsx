import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsCredentialsPage } from "@/features/build/settings/project-settings-credentials-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Credentials — Agent Settings",
};

export default async function ProjectSettingsAgentCredentialsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/agents/credentials");
  const { projectId } = await params;
  return <ProjectSettingsCredentialsPage projectId={parseInt(projectId, 10)} />;
}
