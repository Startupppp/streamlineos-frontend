import { TeamHomePage } from "@/features/projects/teams/team-home-page";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function TeamHomeRoute({ params }: Props) {
  const { teamId } = await params;
  return <TeamHomePage teamId={parseInt(teamId, 10)} />;
}
