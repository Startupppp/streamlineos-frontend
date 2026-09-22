import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectAnalyticsPage } from "@/features/build/analytics/project-analytics-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/analytics");
  const { projectId } = await params;
  return <ProjectAnalyticsPage projectId={Number(projectId)} />;
}
