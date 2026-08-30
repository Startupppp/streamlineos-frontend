import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectsPage } from "@/features/build/project-list/projects-page";

export default async function AllProjectsRoute() {
  await enforceRouteAccess("/build/all");
  return <ProjectsPage />;
}
