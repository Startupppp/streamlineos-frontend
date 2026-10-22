import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import ProjectWikiPageDocument from "@/features/wiki/components/project-wiki-page-document";
import { prefetchWikiPage } from "@/lib/prefetch/build-project-extras";
import ProjectWikiPageLoading from "./loading";

interface ProjectWikiDocPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

async function WikiPageHydrated({ projectId, pageId }: { projectId: number; pageId: number }) {
  const state = await prefetchWikiPage(pageId);
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <ProjectWikiPageDocument projectId={projectId} pageId={pageId} />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default async function ProjectWikiDocPage({ params }: ProjectWikiDocPageProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]");
  const { projectId: rawProjectId, pageId: rawPageId } = await params;
  const projectId = parseInt(rawProjectId, 10);
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0 || !Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  return (
    <Suspense fallback={<ProjectWikiPageLoading />}>
      <WikiPageHydrated projectId={projectId} pageId={pageId} />
    </Suspense>
  );
}
