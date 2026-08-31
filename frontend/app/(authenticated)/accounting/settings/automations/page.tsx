import { requireSession } from "@/lib/rbac/require-permission";
import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default async function FinanceAutomationsPage() {
  await requireSession();
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
