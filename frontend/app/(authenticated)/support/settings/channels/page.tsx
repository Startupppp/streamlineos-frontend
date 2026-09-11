import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { SupportChannelsPage } from "@/features/support/settings/channels-page";

export default async function Page() {
  await enforceRouteAccess("/support/settings/channels");
  return <SupportChannelsPage />;
}
