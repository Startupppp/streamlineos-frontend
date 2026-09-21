import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectApprovalsPage } from "@/features/build/approvals/project-approvals-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectApprovalsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/approvals");
  const { projectId } = await params;
  return <ProjectApprovalsPage projectId={parseInt(projectId, 10)} />;
}
