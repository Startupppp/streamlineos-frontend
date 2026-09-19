import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { WorkspaceRoadmapPage } from "@/features/build/pm-workspaces/workspace-roadmap-page";

export const metadata = {
  title: "Roadmap | Workspace",
};

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function WorkspaceRoadmapRoute({ params }: Props) {
  await requireModulePermission("build", "build:roadmap:view");
  const { pmWorkspaceId } = await params;
  if (!pmWorkspaceId) notFound();
  return <WorkspaceRoadmapPage pmWorkspaceId={pmWorkspaceId} />;
}
