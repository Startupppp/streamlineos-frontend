"use client";

import { Zap, Columns, Building2, CheckSquare, Bug, Map, Megaphone, Cog, Layers, Headphones, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { StepSharedProps } from "../use-project-create";

interface ProjectTypeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const PROJECT_TYPES: ProjectTypeOption[] = [
  { id: "scrum", label: "Scrum Software", icon: Zap, desc: "Sprints & velocity" },
  { id: "kanban", label: "Kanban Software", icon: Columns, desc: "Flow-based delivery" },
  { id: "client-delivery", label: "Client Delivery", icon: Building2, desc: "Client milestones" },
  { id: "qa-testing", label: "QA / Testing", icon: CheckSquare, desc: "Test cycles & bugs" },
  { id: "bug-tracking", label: "Bug Tracking", icon: Bug, desc: "Defect lifecycle" },
  { id: "product-roadmap", label: "Product Roadmap", icon: Map, desc: "Feature planning" },
  { id: "marketing", label: "Marketing Campaign", icon: Megaphone, desc: "Campaign tracking" },
  { id: "implementation", label: "Implementation", icon: Cog, desc: "Rollout & setup" },
  { id: "internal-ops", label: "Internal Operations", icon: Layers, desc: "Process & ops" },
  { id: "support-sla", label: "Support / SLA", icon: Headphones, desc: "Tickets & SLAs" },
];

export function StepType({ draft, updateDraft }: StepSharedProps) {
  function handleSelect(id: string) {
    updateDraft({ projectType: draft.projectType === id ? "" : id });
  }

  function handleClear() {
    updateDraft({ projectType: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Choose a project type to get tailored defaults. This step is optional.
        </p>
        {draft.projectType && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0 text-muted-foreground gap-1 hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PROJECT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = draft.projectType === type.id;
          return (
            <div
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={cn(
                "cursor-pointer rounded-xl border p-4 flex flex-col gap-2 transition-all",
                isSelected
                  ? "border-primary bg-brand-core/5"
                  : "border-border bg-card hover:border-muted-foreground/40"
              )}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{type.label}</div>
                <div className="text-xs text-muted-foreground">{type.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
