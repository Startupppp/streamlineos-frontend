"use client";

import { Switch } from "@/components/ui/switch";
import type { StepSharedProps } from "../use-project-create";

export function StepToggles({ draft, updateDraft }: StepSharedProps) {
  function handleSprints(v: boolean) {
    updateDraft({ modules: { ...draft.modules, sprints: v } });
  }

  function handleEpics(v: boolean) {
    updateDraft({ modules: { ...draft.modules, epics: v } });
  }

  function handleTimeTracking(v: boolean) {
    updateDraft({ modules: { ...draft.modules, timeTracking: v } });
  }

  function handleWiki(v: boolean) {
    updateDraft({ modules: { ...draft.modules, wiki: v } });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Modules — saved to project</h3>
        <p className="text-xs text-muted-foreground">These settings are stored and affect project capabilities.</p>
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <div className="text-sm font-medium">Sprints</div>
              <div className="text-xs text-muted-foreground">Agile sprint cycles</div>
            </div>
            <Switch checked={draft.modules.sprints} onCheckedChange={handleSprints} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <div className="text-sm font-medium">Epics</div>
              <div className="text-xs text-muted-foreground">Large initiative groupings</div>
            </div>
            <Switch checked={draft.modules.epics} onCheckedChange={handleEpics} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <div className="text-sm font-medium">Time Tracking</div>
              <div className="text-xs text-muted-foreground">Log work hours per ticket</div>
            </div>
            <Switch checked={draft.modules.timeTracking} onCheckedChange={handleTimeTracking} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <div className="text-sm font-medium">Wiki / Docs</div>
              <div className="text-xs text-muted-foreground">Project documentation pages</div>
            </div>
            <Switch checked={draft.modules.wiki} onCheckedChange={handleWiki} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Features — UI defaults only</h3>
        <p className="text-xs text-muted-foreground">
          Additional features (Backlog, Kanban Board, Releases, Budget, Client Portal, Forms, Automations, Approvals) are enabled by default and can be configured after project creation.
        </p>
      </div>
    </div>
  );
}
