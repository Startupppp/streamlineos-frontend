import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import WikiHomePage from "@/features/wiki/components/wiki-home-page";
import { prefetchKbHome } from "@/lib/prefetch/knowledge";
import ProjectWikiLoading from "./loading";

interface ProjectWikiPageProps {
  params: Promise<{ projectId: string }>;
}

async function WikiHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchKbHome();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <WikiHomePage projectId={Number.isFinite(projectId) && projectId > 0 ? projectId : undefined} />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default async function ProjectWikiPage({ params }: ProjectWikiPageProps) {
  await enforceRouteAccess("/build/[projectId]/wiki");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectWikiLoading />}>
      <WikiHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
