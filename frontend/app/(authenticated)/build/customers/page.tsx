import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectCustomersPage } from "@/features/build/customers/project-customers-page";

export default async function BuildCustomersRoute() {
  await enforceRouteAccess("/build/customers");
  return <ProjectCustomersPage />;
}
