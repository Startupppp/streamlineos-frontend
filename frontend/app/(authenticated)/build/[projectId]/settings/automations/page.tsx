import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { AutomationsPage } from "@/features/build/automations/automations-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsAutomationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/automations");
  const { projectId: projectIdStr } = await params;
  return <AutomationsPage projectId={parseInt(projectIdStr, 10)} />;
}
