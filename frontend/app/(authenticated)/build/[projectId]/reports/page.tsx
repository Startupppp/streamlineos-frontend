import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ReportsTabs } from "@/features/build/reports/reports-tabs";

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/reports");
  const { projectId: projectIdStr } = await params;
  return <ReportsTabs projectId={Number(projectIdStr)} />;
}
