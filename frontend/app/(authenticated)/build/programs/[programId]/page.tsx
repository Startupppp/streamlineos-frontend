import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProgramDetailPage } from "@/features/build/programs/program-detail-page";

interface Props {
  params: Promise<{ programId: string }>;
}

export default async function ProgramDetailRoute({ params }: Props) {
  await enforceRouteAccess("/build/programs/[programId]");
  const { programId } = await params;
  return <ProgramDetailPage programId={parseInt(programId, 10)} />;
}
