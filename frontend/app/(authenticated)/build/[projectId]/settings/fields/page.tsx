import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectSettingsFieldsPage } from "@/features/build/settings/project-settings-fields-page";
import { prefetchProjectCustomFields } from "@/lib/prefetch/build-project-extras";
import ProjectSettingsFieldsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Custom Fields — Project Settings",
};

async function FieldsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectCustomFields(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectSettingsFieldsPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectSettingsFieldsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/fields");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectSettingsFieldsLoading />}>
      <FieldsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
