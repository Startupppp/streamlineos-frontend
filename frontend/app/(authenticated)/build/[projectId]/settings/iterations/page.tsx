import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsIterationsPage } from "@/features/build/settings/project-settings-iterations-page";
import { prefetchProjectIterationSettings } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsIterationsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Iterations — Project Settings",
};

async function IterationsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectIterationSettings(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsIterationsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsIterationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/iterations");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsIterationsLoading />}>
      <IterationsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
