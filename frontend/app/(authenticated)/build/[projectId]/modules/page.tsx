import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ModulesPage } from "@/features/build/modules/modules-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/modules");
  const { projectId } = await params;
  return <ModulesPage projectId={Number(projectId)} />;
}
