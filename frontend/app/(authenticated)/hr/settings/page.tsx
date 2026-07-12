"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { HubGrid } from "@/features/hr/settings-hub/hub-grid";

const STORAGE_KEY = "hr-settings-mode";

export default function HrSettingsHubPage() {
  const [isAdvanced, setIsAdvanced] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      try {
        setIsAdvanced(JSON.parse(stored) as boolean);
      } catch {
        // ignore malformed value
      }
    }
  }, []);

  function handleToggle(next: boolean) {
    setIsAdvanced(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <PageWrapper
      title="HR Configuration"
      subtitle="Configure policies, workflows, automations, and org settings"
      actions={
        <div className="bg-muted rounded-lg p-0.5 flex">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={
              !isAdvanced
                ? "rounded-md px-3 py-1 text-xs font-medium transition-colors bg-background shadow-sm text-foreground"
                : "rounded-md px-3 py-1 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
            }
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={
              isAdvanced
                ? "rounded-md px-3 py-1 text-xs font-medium transition-colors bg-background shadow-sm text-foreground"
                : "rounded-md px-3 py-1 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
            }
          >
            Advanced
          </button>
        </div>
      }
    >
      <HubGrid isAdvanced={isAdvanced} />
    </PageWrapper>
  );
}
