import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { GoalsPage } from "@/features/build/goals/goals-page";

export default async function Page() {
  await enforceRouteAccess("/build/goal");
  return <GoalsPage />;
}
