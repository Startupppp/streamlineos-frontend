import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectsPage } from "@/features/build/project-list/projects-page";
import { prefetchBuildProjects } from "@/lib/prefetch/build-portfolio";
import ProjectsLoading from "./loading";

export default async function ProjectsRoute() {
  await enforceRouteAccess("/build/projects");
  const state = await prefetchBuildProjects();
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <HydrationBoundary state={state}>
        <ProjectsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
