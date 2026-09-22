import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBacklogPage } from "@/features/build/backlog/project-backlog-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/backlog");
  const { projectId } = await params;
  return <ProjectBacklogPage projectId={projectId} />;
}
