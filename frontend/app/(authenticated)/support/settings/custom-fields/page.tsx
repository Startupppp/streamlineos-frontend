import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { SupportCustomFieldsPage } from "@/features/support/settings/custom-fields/custom-fields-page";

export default async function Page() {
  await enforceRouteAccess("/support/settings/custom-fields");
  return <SupportCustomFieldsPage />;
}
