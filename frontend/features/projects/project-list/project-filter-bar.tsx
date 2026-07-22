"use client";

import { useCallback, type ReactNode } from "react";
import { LayoutGrid, List, PanelRight } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
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
  leading?: ReactNode;
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
  leading,
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
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto sm:overscroll-x-contain sm:scrollbar-hide sm:touch-pan-x">
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
          {leading ? <div className="shrink-0 sm:hidden">{leading}</div> : null}
          <div className="shrink-0 sm:order-2">
            <AddFilterPopover filters={filters} onFiltersChange={onFiltersChange} />
          </div>
          <div className="shrink-0 sm:order-3">
            <DisplayPrefsPopover
              prefs={prefs}
              onToggle={onTogglePrefs}
              onSet={onSetPrefs}
            />
          </div>
          <div className="ml-auto shrink-0 sm:order-4">
            <ViewToggle
              value={viewMode}
              options={VIEW_OPTIONS}
              onChange={onViewModeChange}
            />
          </div>
        </div>

        <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
          <div className="min-w-0 flex-1 sm:order-1 sm:w-[200px] sm:max-w-[min(240px,70vw)] sm:flex-none md:w-[240px]">
            <SearchInput
              placeholder="Search projects…"
              value={search}
              onValueChange={onSearchChange}
              aria-label="Search projects"
            />
          </div>
          {viewMode === "list" && onToggleGroupingSidebar ? (
            <div className="shrink-0 sm:order-5">
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
            </div>
          ) : null}
        </div>
      </div>

      {hasChips ? (
        <ActiveFilterChips filters={filters} onRemove={handleRemoveFilter} leadName={leadName} />
      ) : null}
    </div>
  );
}
