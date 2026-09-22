import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BuildTemplatesPage } from "@/features/build/templates/build-templates-page";

export default async function Page() {
  await enforceRouteAccess("/build/templates");
  return <BuildTemplatesPage />;
}
