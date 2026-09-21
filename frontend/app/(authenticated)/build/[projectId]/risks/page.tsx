import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RisksPage } from "@/features/build/governance/risks-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectRisksRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/risks");
  const { projectId } = await params;
  return <RisksPage projectId={parseInt(projectId, 10)} />;
}
