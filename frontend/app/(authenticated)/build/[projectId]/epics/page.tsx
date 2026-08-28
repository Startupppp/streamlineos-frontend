import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { EpicsPage } from "@/features/build/epics/epics-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EpicsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/epics");
  return <EpicsPage params={params} />;
}
