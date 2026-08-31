import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { serverGet } from "@/lib/server-fetch";
import type { ProjectWithDetails } from "@/types/projects";
import { RememberLastProject } from "@/features/build/sidebar/remember-last-project";

interface PmWorkspaceProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function PmWorkspaceProjectLayout({
  children,
  params,
}: PmWorkspaceProjectLayoutProps) {
  await enforceRouteAccess("/build/workspaces");
  const { pmWorkspaceId, projectId } = await params;
  const numId = Number(projectId);
  if (Number.isNaN(numId)) notFound();

  let project: ProjectWithDetails | null = null;
  try {
    project = await serverGet<ProjectWithDetails>(`/build/${numId}`);
  } catch {
    notFound();
  }

  if (!project?.pmWorkspaceId || project.pmWorkspaceId !== pmWorkspaceId) {
    notFound();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RememberLastProject projectId={projectId} />
      {children}
    </div>
  );
}
