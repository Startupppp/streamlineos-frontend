"use client";

import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StepSharedProps, WizardDraft } from "../use-project-create";

type ModKey = keyof WizardDraft["modules"];
type ModulesType = WizardDraft["modules"];

type ToggleDef =
  | { kind: "feature"; key: string; label: string; desc: string; syncMod?: ModKey }
  | { kind: "module"; key: ModKey; label: string; desc: string };

const GROUPS: { title: string; items: ToggleDef[] }[] = [
  {
    title: "Work",
    items: [
      { kind: "feature", key: "backlog", label: "Backlog", desc: "Unscheduled work queue" },
      { kind: "feature", key: "sprints", label: "Sprints", desc: "Agile sprint cycles", syncMod: "sprints" },
      { kind: "feature", key: "kanban", label: "Kanban Board", desc: "Visual workflow board" },
      { kind: "module", key: "epics", label: "Epics", desc: "Large initiative groupings" },
      { kind: "feature", key: "bugs", label: "Bug Tracker", desc: "Dedicated bug reporting" },
      { kind: "feature", key: "qa", label: "QA / Testing", desc: "Test cases and QA cycles" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { kind: "feature", key: "releases", label: "Releases", desc: "Version release management" },
      { kind: "feature", key: "timeTracking", label: "Time Tracking", desc: "Log work hours per ticket", syncMod: "timeTracking" },
      { kind: "feature", key: "approvals", label: "Approvals", desc: "Multi-stage approval flows" },
      { kind: "feature", key: "devops", label: "DevOps / CI", desc: "Pipeline and deployment tracking" },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { kind: "feature", key: "chat", label: "Chat", desc: "Project-scoped messaging" },
      { kind: "feature", key: "docs", label: "Docs / Wiki", desc: "Project documentation pages", syncMod: "wiki" },
    ],
  },
  {
    title: "Business",
    items: [
      { kind: "feature", key: "budget", label: "Budget", desc: "Cost tracking and forecasting" },
      { kind: "feature", key: "clientPortal", label: "Client Portal", desc: "External client visibility" },
      { kind: "feature", key: "changeRequests", label: "Change Requests", desc: "Formal change request tracking" },
      { kind: "feature", key: "forms", label: "Forms", desc: "Custom intake and survey forms" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { kind: "feature", key: "automations", label: "Automations", desc: "Rule-based workflow automations" },
      { kind: "feature", key: "ai", label: "AI Assistant", desc: "AI-powered project assistance" },
    ],
  },
];

function applyToModules(draft: WizardDraft, key: ModKey, v: boolean): ModulesType {
  return {
    sprints: key === "sprints" ? v : draft.modules.sprints,
    epics: key === "epics" ? v : draft.modules.epics,
    timeTracking: key === "timeTracking" ? v : draft.modules.timeTracking,
    wiki: key === "wiki" ? v : draft.modules.wiki,
  };
}

function makeFeatureHandler(
  key: string,
  syncMod: ModKey | undefined,
  draft: WizardDraft,
  updateDraft: (p: Partial<WizardDraft>) => void,
): (v: boolean) => void {
  return function handleFeature(v: boolean) {
    const features = { ...draft.features, [key]: v };
    if (syncMod === undefined) {
      updateDraft({ features });
    } else {
      updateDraft({ features, modules: applyToModules(draft, syncMod, v) });
    }
  };
}

function makeModuleHandler(
  key: ModKey,
  draft: WizardDraft,
  updateDraft: (p: Partial<WizardDraft>) => void,
): (v: boolean) => void {
  return function handleModule(v: boolean) {
    updateDraft({ modules: applyToModules(draft, key, v) });
  };
}

function getChecked(item: ToggleDef, draft: WizardDraft): boolean {
  if (item.kind === "module") return draft.modules[item.key];
  return draft.features[item.key] ?? false;
}

function getHandler(
  item: ToggleDef,
  draft: WizardDraft,
  updateDraft: (p: Partial<WizardDraft>) => void,
): (v: boolean) => void {
  if (item.kind === "module") return makeModuleHandler(item.key, draft, updateDraft);
  return makeFeatureHandler(item.key, item.syncMod, draft, updateDraft);
}

export function StepToggles({ draft, updateDraft }: StepSharedProps) {
  return (
    <ScrollArea
      fill
      className="min-h-0 flex-1"
      viewportClassName="overscroll-contain"
    >
      <div className="space-y-6 py-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <div className="space-y-2">
              {group.items.map((item) => {
                const id = item.kind === "module" ? `mod-${item.key}` : `feat-${item.key}`;
                return (
                  <div key={id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <Switch
                      checked={getChecked(item, draft)}
                      onCheckedChange={getHandler(item, draft, updateDraft)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
