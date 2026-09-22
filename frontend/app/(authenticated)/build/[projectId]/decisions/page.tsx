import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { DecisionsPage } from "@/features/build/governance/decisions-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDecisionsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/decisions");
  const { projectId } = await params;
  return <DecisionsPage projectId={parseInt(projectId, 10)} />;
}
