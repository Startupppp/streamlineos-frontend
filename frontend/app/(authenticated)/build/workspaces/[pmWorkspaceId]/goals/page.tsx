import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkspaceGoalsPage } from "@/features/build/pm-workspaces/workspace-goals-page";

export const metadata = {
  title: "Goals | Workspace",
};

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function WorkspaceGoalsRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/goals");
  const { pmWorkspaceId } = await params;
  if (!pmWorkspaceId) notFound();
  return <WorkspaceGoalsPage pmWorkspaceId={pmWorkspaceId} />;
}
