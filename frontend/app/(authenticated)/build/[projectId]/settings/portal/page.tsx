import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsPortalPage } from "@/features/build/settings/project-settings-portal-page";
import { prefetchProjectPortalSettings } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsPortalLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Portal — Project Settings",
};

async function PortalHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectPortalSettings(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsPortalPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsPortalRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/portal");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsPortalLoading />}>
      <PortalHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
