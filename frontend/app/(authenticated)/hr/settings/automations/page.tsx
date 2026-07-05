"use client";

import { ModuleAutomationsSettings } from "@/features/shared/automations/module-automations-settings";

export default function HrAutomationsPage() {
  return (
    <ModuleAutomationsSettings
      config={{
        sectionModule: "hr",
        moduleLabel: "HR",
        moduleEnabledKey: "HR",
        subtitle: "Automation rules for HR and recruitment events",
      }}
    />
  );
}
