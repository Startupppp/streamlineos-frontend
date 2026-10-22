import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsCredentialsPage } from "@/features/build/settings/project-settings-credentials-page";
import { prefetchAgentTokens } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsCredentialsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Credentials — Agent Settings",
};

async function CredentialsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchAgentTokens();
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsCredentialsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsAgentCredentialsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/agents/credentials");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsCredentialsLoading />}>
      <CredentialsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
