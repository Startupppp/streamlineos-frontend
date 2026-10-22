import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsRetentionPage } from "@/features/build/settings/project-settings-retention-page";
import { prefetchProjectRetentionSettings } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsRetentionLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Retention — Project Settings",
};

async function RetentionHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectRetentionSettings(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsRetentionPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsRetentionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/retention");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  return (
    <Suspense fallback={<ProjectSettingsRetentionLoading />}>
      <RetentionHydrated projectId={projectId} />
    </Suspense>
  );
}
