import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TeamHomePage } from "@/features/build/teams/team-home-page";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function TeamHomeRoute({ params }: Props) {
  await enforceRouteAccess("/build/teams/[teamId]");
  const { teamId } = await params;
  return <TeamHomePage teamId={parseInt(teamId, 10)} />;
}
