import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { AutomationsPage } from "@/features/build/automations/automations-page";
import { prefetchProjectAutomations } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsAutomationsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function AutomationsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectAutomations(projectId);
  return (
    <HydrationBoundary state={state}>
      <AutomationsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsAutomationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/automations");
  const { projectId: projectIdStr } = await params;
  return (
    <Suspense fallback={<ProjectSettingsAutomationsLoading />}>
      <AutomationsHydrated projectId={parseInt(projectIdStr, 10)} />
    </Suspense>
  );
}
