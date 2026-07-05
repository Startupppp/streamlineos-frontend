"use client";

import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default function SupportAutomationsPage() {
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
