import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RoadmapListPage } from "@/features/build/roadmap/roadmap-list-page";

export default async function Page() {
  await enforceRouteAccess("/build/roadmap");
  return <RoadmapListPage />;
}
