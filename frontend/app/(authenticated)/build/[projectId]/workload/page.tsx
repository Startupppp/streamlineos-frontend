import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkloadBoardPage } from "@/features/build/workload/workload-board-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWorkloadRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/workload");
  return <WorkloadBoardPage params={params} />;
}
