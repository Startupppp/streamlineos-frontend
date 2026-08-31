import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ViewsPage } from "@/features/build/views/views-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ViewsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/views");
  return <ViewsPage params={params} />;
}
