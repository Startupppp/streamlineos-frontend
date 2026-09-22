import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkflowPage } from "@/features/build/workflow/workflow-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsWorkflowRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/workflow");
  const { projectId } = await params;
  return <WorkflowPage projectId={parseInt(projectId, 10)} />;
}
