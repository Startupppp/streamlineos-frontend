import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ReleasesPage } from "@/features/build/releases/releases-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ReleasesRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/releases");
  const { projectId: projectIdStr } = await params;
  return <ReleasesPage projectId={Number(projectIdStr)} />;
}
