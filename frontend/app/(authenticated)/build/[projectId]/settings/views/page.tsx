import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsViewsPage } from "@/features/build/settings/project-settings-views-page";
import { prefetchProjectViews } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsViewsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Saved Views — Project Settings",
};

async function ViewsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectViews(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsViewsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsViewsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/views");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsViewsLoading />}>
      <ViewsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
