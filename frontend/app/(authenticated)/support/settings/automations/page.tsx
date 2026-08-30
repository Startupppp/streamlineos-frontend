import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default async function SupportAutomationsPage() {
  await enforceRouteAccess("/support/settings/automations");
  return (
    <ModuleAutomationsSettings
      config={{
        sectionModule: "support",
        moduleLabel: "Support",
        moduleEnabledKey: "HELPDESK",
        subtitle: "Automation rules for support ticket events",
      }}
    />
  );
}
