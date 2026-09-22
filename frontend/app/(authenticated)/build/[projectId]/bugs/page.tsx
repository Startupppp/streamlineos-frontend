import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BugsPage } from "@/features/build/bugs/bugs-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function BugsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/bugs");
  const { projectId: projectIdStr } = await params;
  return <BugsPage projectId={parseInt(projectIdStr, 10)} />;
}
