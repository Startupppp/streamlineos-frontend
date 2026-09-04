import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { prefetchBuildProject } from "@/lib/prefetch/build";
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
  let hydrated: DehydratedState | null = null;
  try {
    // PRD-C094 — the twin of `/build/[projectId]/layout.tsx`; the same single read seeds
    // the cache the client `useProject` callers below read from.
    const prefetched = await prefetchBuildProject(numId);
    project = prefetched.project;
    hydrated = prefetched.state;
  } catch {
    notFound();
  }

  if (!project?.pmWorkspaceId || project.pmWorkspaceId !== pmWorkspaceId) {
    notFound();
  }

  return (
    <HydrationBoundary state={hydrated}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RememberLastProject projectId={projectId} />
        {children}
      </div>
    </HydrationBoundary>
  );
}
