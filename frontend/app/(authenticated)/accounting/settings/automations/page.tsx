"use client";

import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default function FinanceAutomationsPage() {
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
