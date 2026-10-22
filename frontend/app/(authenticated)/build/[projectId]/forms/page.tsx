import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FormsListPage } from "@/features/build/forms/forms-list-page";
import { prefetchProjectForms } from "@/lib/prefetch/build-project-extras";
import ProjectFormsLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function FormsHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectForms(projectId);
  return (
    <HydrationBoundary state={state}>
      <FormsListPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectFormsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/forms");
  const { projectId } = await params;
  return (
    <Suspense fallback={<ProjectFormsLoading />}>
      <FormsHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
