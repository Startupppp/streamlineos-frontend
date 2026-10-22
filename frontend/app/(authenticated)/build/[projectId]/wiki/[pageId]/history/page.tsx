import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";
import { prefetchWikiPageHistory } from "@/lib/prefetch/build-project-extras";
import WikiPageHistoryLoading from "./loading";

interface ProjectWikiHistoryPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
  searchParams?: Promise<{ version?: string; compare?: string }>;
}

async function WikiHistoryHydrated({
  projectId,
  pageId,
  initialVersion,
  initialCompare,
}: {
  projectId: number;
  pageId: number;
  initialVersion: number | undefined;
  initialCompare: number | undefined;
}) {
  const state = await prefetchWikiPageHistory(pageId);
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <PageHistoryPage
          pageId={pageId}
          projectId={projectId}
          initialVersion={initialVersion}
          initialCompare={initialCompare}
        />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default async function ProjectWikiHistoryPage({
  params,
  searchParams,
}: ProjectWikiHistoryPageProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]/history");
  const { projectId: rawProjectId, pageId: rawPageId } = await params;
  const projectId = parseInt(rawProjectId, 10);
  const pageId = parseInt(rawPageId, 10);
  if (
    !Number.isFinite(projectId) ||
    projectId <= 0 ||
    !Number.isFinite(pageId) ||
    pageId <= 0
  ) {
    notFound();
  }
  const sp = searchParams ? await searchParams : {};
  const rawVersion = sp.version ? parseInt(sp.version, 10) : NaN;
  const rawCompare = sp.compare ? parseInt(sp.compare, 10) : NaN;
  const initialVersion = Number.isFinite(rawVersion) && rawVersion > 0 ? rawVersion : undefined;
  const initialCompare = Number.isFinite(rawCompare) && rawCompare > 0 ? rawCompare : undefined;
  return (
    <Suspense fallback={<WikiPageHistoryLoading />}>
      <WikiHistoryHydrated
        projectId={projectId}
        pageId={pageId}
        initialVersion={initialVersion}
        initialCompare={initialCompare}
      />
    </Suspense>
  );
}
