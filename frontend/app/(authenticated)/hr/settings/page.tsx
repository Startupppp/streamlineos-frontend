"use client";

import { ListChecks, SlidersHorizontal } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { HubGrid } from "@/features/hr/settings-hub/hub-grid";
import { useHrSettingsMode } from "@/features/hr/settings-hub/use-hr-settings-mode";

type SettingsMode = "simple" | "advanced";

const MODE_OPTIONS: ViewOption<SettingsMode>[] = [
  { value: "simple", icon: ListChecks, label: "Simple" },
  { value: "advanced", icon: SlidersHorizontal, label: "Advanced" },
];

export default function HrSettingsHubPage() {
  const [isAdvanced, setMode] = useHrSettingsMode();

  function handleModeChange(next: SettingsMode) {
    setMode(next === "advanced");
  }

  return (
    <PageWrapper
      title="HR configuration"
      subtitle={isAdvanced ? "Every configuration surface, including workflows, automations and versioning" : "The guided essentials"}
      actions={
        <ViewToggle
          value={isAdvanced ? "advanced" : "simple"}
          options={MODE_OPTIONS}
          onChange={handleModeChange}
          showLabel
        />
      }
    >
      <HubGrid isAdvanced={isAdvanced} />
    </PageWrapper>
  );
}
