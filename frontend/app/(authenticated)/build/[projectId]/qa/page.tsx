import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { QaPage } from "@/features/build/qa/qa-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function QaRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/qa");
  const { projectId: projectIdStr } = await params;
  return <QaPage projectId={parseInt(projectIdStr, 10)} />;
}
