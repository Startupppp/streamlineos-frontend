import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsAgentsPage } from "@/features/build/settings/project-settings-agents-page";
import { prefetchAgentTokens } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsAgentsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Agents — Project Settings",
};

async function AgentsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchAgentTokens();
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsAgentsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsAgentsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/agents");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsAgentsLoading />}>
      <AgentsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
