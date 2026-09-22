import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkspaceRoadmapPage } from "@/features/build/pm-workspaces/workspace-roadmap-page";

export const metadata = {
  title: "Roadmap | Workspace",
};

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function WorkspaceRoadmapRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/roadmap");
  const { pmWorkspaceId } = await params;
  if (!pmWorkspaceId) notFound();
  return <WorkspaceRoadmapPage pmWorkspaceId={pmWorkspaceId} />;
}
