import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MyTicketsPage } from "@/features/build/my-tickets/my-tickets-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function MyTicketsWorkspaceRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/[projectId]/my-tickets");
  return <MyTicketsPage params={params} />;
}
