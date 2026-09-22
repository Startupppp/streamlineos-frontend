import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectMilestonesPage } from "@/features/build/milestones/project-milestones-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/milestones");
  const { projectId } = await params;
  return <ProjectMilestonesPage projectId={projectId} />;
}
