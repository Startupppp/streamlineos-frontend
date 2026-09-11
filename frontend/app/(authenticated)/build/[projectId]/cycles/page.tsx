import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CyclesPage } from "@/features/build/cycles/cycles-page";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function CyclesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/cycles");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr);
  return <CyclesPage projectId={projectId} />;
}
