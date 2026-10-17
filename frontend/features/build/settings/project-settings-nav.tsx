"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  ListChecks,
  Settings2,
  ShieldAlert,
  Tags,
  UsersRound,
} from "lucide-react";
import { PmPanel } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export type SectionId =
  | "general"
  | "labels"
  | "statuses"
  | "custom-fields"
  | "teams"
  | "danger";

interface NavSection {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BASE_NAV: NavSection[] = [
  {
    id: "general",
    label: "General",
    description: "Identity, ownership, members, and billing",
    icon: Settings2,
  },
  {
    id: "labels",
    label: "Labels",
    description: "Reusable work classification",
    icon: Tags,
  },
  {
    id: "statuses",
    label: "Statuses",
    description: "Workflow states and limits",
    icon: CircleDot,
  },
  {
    id: "custom-fields",
    label: "Custom Fields",
    description: "Structured project metadata",
    icon: ListChecks,
  },
  {
    id: "teams",
    label: "Teams & Roster",
    description: "Inherited access and staffing",
    icon: UsersRound,
  },
];

export const DANGER_SECTION: NavSection = {
  id: "danger",
  label: "Danger Zone",
  description: "Permanent project actions",
  icon: ShieldAlert,
};

export function isSectionId(value: string): value is SectionId {
  return (
    value === "general" ||
    value === "labels" ||
    value === "statuses" ||
    value === "custom-fields" ||
    value === "teams" ||
    value === "danger"
  );
}

interface ProjectSettingsNavListProps {
  sections: NavSection[];
  activeSection: SectionId;
  onSectionClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ProjectSettingsNavList({
  sections,
  activeSection,
  onSectionClick,
}: ProjectSettingsNavListProps) {
  return (
    <PmPanel className="p-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col" solid>
      <div className="px-2 pb-2 pt-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Project configuration
        </p>
      </div>
      <nav
        aria-label="Project settings"
        className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:content-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              data-section={section.id}
              aria-label={section.label}
              aria-current={isActive ? "page" : undefined}
              onClick={onSectionClick}
              className={cn(
                "group flex min-w-0 items-start gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                section.id === "danger" && "lg:mt-2 lg:border-t-border",
                isActive
                  ? section.id === "danger"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : "border-border bg-accent text-accent-foreground shadow-xs"
                  : section.id === "danger"
                    ? "text-destructive hover:bg-destructive/5"
                    : "text-foreground/80 hover:border-border hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-5">
                  {section.label}
                </span>
                <span className="mt-0.5 hidden text-xs leading-4 text-muted-foreground lg:block">
                  {section.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </PmPanel>
  );
}
