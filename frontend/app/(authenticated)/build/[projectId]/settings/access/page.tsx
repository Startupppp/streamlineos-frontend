import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsAccessPage } from "@/features/build/settings/project-settings-access-page";
import { prefetchProjectMembers } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsAccessLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Access — Project Settings",
};

async function AccessHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectMembers(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsAccessPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsAccessRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/access");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsAccessLoading />}>
      <AccessHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
