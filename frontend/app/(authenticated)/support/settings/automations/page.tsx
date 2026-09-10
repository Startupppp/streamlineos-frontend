import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { SupportAutomationsSettings } from "@/features/support/settings/automations/support-automations-settings";

export default async function SupportAutomationsPage() {
  await enforceRouteAccess("/support/settings/automations");
  return <SupportAutomationsSettings />;
}
