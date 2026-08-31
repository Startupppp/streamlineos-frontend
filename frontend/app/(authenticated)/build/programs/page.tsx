import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProgramsPage } from "@/features/build/programs/programs-page";

export default async function ProgramsRoute() {
  await enforceRouteAccess("/build/programs");
  return <ProgramsPage />;
}
