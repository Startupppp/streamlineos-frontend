"use client";

import { useCallback } from "react";
import { LayoutGrid, List, PanelRight } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { AddFilterPopover, ActiveFilterChips, type ProjectActiveFilters } from "./add-filter-popover";
import { DisplayPrefsPopover } from "./display-prefs-popover";
import type { DisplayPrefs } from "./use-display-prefs";

type ViewMode = "grid" | "list";

const VIEW_OPTIONS: ViewOption<ViewMode>[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
  { value: "list", icon: List, label: "List view" },
];

interface ProjectFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filters: ProjectActiveFilters;
  onFiltersChange: (next: ProjectActiveFilters) => void;
  prefs: DisplayPrefs;
  onTogglePrefs: (key: keyof DisplayPrefs) => void;
  onSetPrefs: (next: Partial<DisplayPrefs>) => void;
  leadName?: string;
  showGroupingSidebar?: boolean;
  onToggleGroupingSidebar?: () => void;
}

export function ProjectFilterBar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  prefs,
  onTogglePrefs,
  onSetPrefs,
  leadName,
  showGroupingSidebar = false,
  onToggleGroupingSidebar,
}: ProjectFilterBarProps) {
  const handleRemoveFilter = useCallback(
    (key: keyof ProjectActiveFilters) => {
      const next = { ...filters };
      delete next[key];
      onFiltersChange(next);
    },
    [filters, onFiltersChange],
  );

  const hasChips =
    Boolean(filters.status) || Boolean(filters.health) || Boolean(filters.lead);

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(FILTER_TOOLBAR_ROW, "gap-1.5 sm:gap-2")}>
        <div className="w-[200px] max-w-[min(240px,70vw)] sm:w-[240px]">
          <SearchInput
            placeholder="Search projects…"
            value={search}
            onValueChange={onSearchChange}
            aria-label="Search projects"
          />
        </div>

        <AddFilterPopover filters={filters} onFiltersChange={onFiltersChange} />

        <DisplayPrefsPopover
          prefs={prefs}
          onToggle={onTogglePrefs}
          onSet={onSetPrefs}
        />

        <ViewToggle
          value={viewMode}
          options={VIEW_OPTIONS}
          onChange={onViewModeChange}
          className="ml-auto shrink-0"
        />

        {viewMode === "list" && onToggleGroupingSidebar ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "size-9 shrink-0",
              showGroupingSidebar && "border-primary bg-primary/10 text-primary",
            )}
            aria-label="Toggle grouping sidebar"
            aria-pressed={showGroupingSidebar}
            onClick={onToggleGroupingSidebar}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {hasChips ? (
        <ActiveFilterChips filters={filters} onRemove={handleRemoveFilter} leadName={leadName} />
      ) : null}
    </div>
  );
}
