"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { HubGrid } from "@/features/hr/settings-hub/hub-grid";
import { useHrSettingsMode } from "@/features/hr/settings-hub/use-hr-settings-mode";

export default function HrSettingsHubPage() {
  const [isAdvanced, setMode] = useHrSettingsMode();

  function handleSelectSimple() {
    setMode(false);
  }

  function handleSelectAdvanced() {
    setMode(true);
  }

  return (
    <PageWrapper
      title="HR Configuration"
      subtitle={
        isAdvanced
          ? "All configuration surfaces, including workflows, automations, and versioning tools"
          : "Guided essentials — switch to Advanced for workflows, automations, and versioning tools"
      }
      variant="display"
      actions={
        <div className="bg-muted/40 border border-border/70 rounded-xl p-0.5 flex backdrop-blur-sm">
          <button
            type="button"
            onClick={handleSelectSimple}
            aria-pressed={!isAdvanced}
            className={
              !isAdvanced
                ? "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-background shadow-sm text-foreground"
                : "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
            }
          >
            Simple
          </button>
          <button
            type="button"
            onClick={handleSelectAdvanced}
            aria-pressed={isAdvanced}
            className={
              isAdvanced
                ? "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-background shadow-sm text-foreground"
                : "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
            }
          >
            Advanced
          </button>
        </div>
      }
    >
      <HubGrid isAdvanced={isAdvanced} onSwitchToAdvanced={handleSelectAdvanced} />
    </PageWrapper>
  );
}
