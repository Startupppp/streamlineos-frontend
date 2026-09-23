import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBudgetPage } from "@/features/build/project-detail/project-budget-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/budget");
  const { projectId } = await params;
  return <ProjectBudgetPage projectId={projectId} />;
}
