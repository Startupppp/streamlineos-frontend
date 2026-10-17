"use client";

import { useRef, useState } from "react";
import { UserIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { useIsBelowLg, useIsMobile } from "@/hooks/common/use-mobile";
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
  const isMobile = useIsMobile();
  const isBelowLg = useIsBelowLg();
  const isTablet = isBelowLg && !isMobile;
  const [tabletSearchExpanded, setTabletSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      data-slot="all-work-toolbar"
      className={cn(
        "grid w-full min-w-0 gap-2 md:grid-cols-[2.25rem_minmax(0,1fr)] md:items-center lg:grid-cols-[minmax(12rem,1fr)_auto]",
        isTablet &&
          tabletSearchExpanded &&
          "md:grid-cols-[minmax(12rem,1fr)_auto]",
      )}
    >
      <div data-slot="all-work-toolbar-search" className="min-w-0">
        <TicketFilterBar
          className="w-full"
          showFilters={false}
          showChips={false}
          fillSearch
          members={buildMembers}
          projectOptions={projectOptions}
          showTypeFilter
          showAssigneeFilter
          statuses={orgStates}
          presentation="all-work"
          collapsibleSearch={isTablet}
          searchExpanded={!isTablet || tabletSearchExpanded}
          onSearchExpandedChange={setTabletSearchExpanded}
          searchInputRef={searchInputRef}
        />
      </div>

      <div
        data-slot="all-work-toolbar-controls"
        className={cn(
          "flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide md:justify-end md:overflow-visible md:pb-0",
          isTablet &&
            tabletSearchExpanded &&
            "[&_[data-tablet-secondary]]:hidden",
        )}
      >
        <div
          data-tablet-secondary
          className="order-1 flex shrink-0 items-center gap-2 md:order-none"
          role="group"
          aria-label="View options"
        >
          <AllWorkViewSwitcher activeView={view} onViewChange={onViewChange} />
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
        </div>

        <div data-tablet-secondary className="order-3 md:order-none">
          <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
        </div>

        <TicketFilterBar
          presentation="all-work"
          className="order-2 !w-auto shrink-0 md:order-none"
          showSearch={false}
          showChips={false}
          members={buildMembers}
          projectOptions={projectOptions}
          showTypeFilter
          showAssigneeFilter
          iconOnlyFilters
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

        <div className="order-4 shrink-0 md:order-none">
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
      </div>
    </div>
  );
}
