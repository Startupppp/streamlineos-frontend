"use client";

import { UserIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { ResponsiveBuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { StatusOptionSource } from "@/features/build/shared/types";
import { cn } from "@/lib/utils";
import type { BuildMember } from "@/hooks/api/build/build-members";
import { AllWorkViewSwitcher, type AllWorkView } from "./all-work-view-switcher";
import { AllWorkViewsMenu } from "./all-work-views-menu";

const GROUP_OPTIONS = [
  { value: "project", label: "By Project" },
  { value: "status", label: "By Status" },
  { value: "priority", label: "By Priority" },
  { value: "assignee", label: "By Assignee" },
  { value: "none", label: "No grouping" },
] as const;

interface AllWorkPageToolbarProps {
  view: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
  grouping: string;
  onGroupChange: (v: string) => void;
  scopeMine: boolean;
  onScopeToggle: () => void;
  buildMembers: BuildMember[];
  projectOptions: { id: number; name: string; key: string }[];
  orgStates: readonly StatusOptionSource[] | undefined;
  teamOptions: { value: string; label: string }[];
  productOptions: { value: string; label: string }[];
  teamIdFilter: string | null | undefined;
  productIdFilter: string | null | undefined;
  onTeamFilter: (v: string) => void;
  onProductFilter: (v: string) => void;
  hasActiveFilters: boolean;
}

export function AllWorkPageToolbar({
  view,
  onViewChange,
  grouping,
  onGroupChange,
  scopeMine,
  onScopeToggle,
  buildMembers,
  projectOptions,
  orgStates,
  teamOptions,
  productOptions,
  teamIdFilter,
  productIdFilter,
  onTeamFilter,
  onProductFilter,
  hasActiveFilters,
}: AllWorkPageToolbarProps) {
  return (
    <PageTabsToolbar
      tabsDensity="icons"
      filtersAlwaysVisible
      tabs={
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <AllWorkViewSwitcher activeView={view} onViewChange={onViewChange} />
          <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
          <Select value={grouping} onValueChange={onGroupChange}>
            <SelectTrigger
              className="w-[120px] shrink-0 font-normal *:data-[slot=select-value]:font-normal"
              aria-label="Group tickets by"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatedIconButton
            type="button"
            variant="outline"
            size="icon"
            onClick={onScopeToggle}
            aria-label={
              scopeMine
                ? "Showing my tickets – click to show all"
                : "Show only my tickets"
            }
            title={scopeMine ? "Showing my tickets" : "Show only my tickets"}
            aria-pressed={scopeMine}
            className={cn(
              "shrink-0",
              scopeMine &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            icon={UserIcon}
            iconSize={14}
            iconClassName={cn(scopeMine ? "text-primary-foreground" : undefined)}
          />
        </div>
      }
      filters={
        <TicketFilterBar
          presentation="all-work"
          className="sm:w-auto sm:flex-1"
          members={buildMembers}
          projectOptions={projectOptions}
          showTypeFilter
          showAssigneeFilter
          statuses={orgStates}
          trailing={
            <>
              {teamOptions.length > 1 && (
                <ResponsiveBuildFilterSelect
                  label="Team"
                  value={teamIdFilter ?? ""}
                  onValueChange={onTeamFilter}
                  options={teamOptions}
                />
              )}
              {productOptions.length > 1 && (
                <ResponsiveBuildFilterSelect
                  label="Product"
                  value={productIdFilter ?? ""}
                  onValueChange={onProductFilter}
                  options={productOptions}
                />
              )}
            </>
          }
        />
      }
    />
  );
}
