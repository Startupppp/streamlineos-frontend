"use client";

import { cn } from "@/lib/utils";
import type { StepSharedProps } from "../use-project-create";
import { activationProps } from "@/lib/keyboard-activation";

interface WorkflowOption {
  id: string;
  label: string;
  desc: string;
  stages: number;
}

const WORKFLOWS: WorkflowOption[] = [
  { id: "simple", label: "Simple", desc: "Backlog → In Progress → Done", stages: 3 },
  { id: "developer", label: "Developer", desc: "Backlog → Design → Dev → Review → Testing → Done", stages: 6 },
  { id: "qa", label: "QA", desc: "Backlog → Dev → QA → Staging → Done", stages: 5 },
  { id: "client", label: "Client Delivery", desc: "Discovery → Build → Review → Client Approval → Done", stages: 5 },
  { id: "support", label: "Support", desc: "New → Triage → In Progress → Resolved → Closed", stages: 5 },
  { id: "custom", label: "Custom", desc: "Define your own statuses after creation", stages: 0 },
];

export function StepWorkflow({ draft, updateDraft }: StepSharedProps) {
  function handleSelect(id: string) {
    updateDraft({ workflow: id });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose a workflow that matches how your team works.
      </p>
      <div className="space-y-2">
        {WORKFLOWS.map((w) => (
          <div
            key={w.id}
            {...activationProps(() => handleSelect(w.id), w.label)}
            className={cn(
              "cursor-pointer rounded-xl border p-4 flex items-start justify-between gap-4 transition-all",
              draft.workflow === w.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-muted-foreground/40"
            )}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{w.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{w.desc}</div>
            </div>
            {w.stages > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {w.stages} stages
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
