import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default async function FinanceAutomationsPage() {
  await enforceRouteAccess("/accounting/settings/automations");
  return (
    <ModuleAutomationsSettings
      config={{
        sectionModule: "finance",
        moduleLabel: "Finance",
        moduleEnabledKey: "FINANCE",
        subtitle: "Automation rules for finance and invoicing events",
      }}
    />
  );
}
