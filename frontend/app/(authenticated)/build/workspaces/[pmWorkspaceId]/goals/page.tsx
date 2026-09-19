import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { WorkspaceGoalsPage } from "@/features/build/pm-workspaces/workspace-goals-page";

export const metadata = {
  title: "Goals | Workspace",
};

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function WorkspaceGoalsRoute({ params }: Props) {
  await requireModulePermission("build", "build:goals:view");
  const { pmWorkspaceId } = await params;
  if (!pmWorkspaceId) notFound();
  return <WorkspaceGoalsPage pmWorkspaceId={pmWorkspaceId} />;
}
