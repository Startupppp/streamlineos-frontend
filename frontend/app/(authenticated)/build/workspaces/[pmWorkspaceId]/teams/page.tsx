import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TeamsListPage } from "@/features/build/teams/teams-list-page";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function PmWorkspaceTeamsRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/teams");
  const { pmWorkspaceId } = await params;
  return <TeamsListPage pmWorkspaceId={pmWorkspaceId} />;
}
