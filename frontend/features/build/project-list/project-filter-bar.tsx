"use client";

import { useCallback } from "react";
import { LayoutGrid, List, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";
import { AddFilterPopover, type ProjectActiveFilters } from "./add-filter-popover";
import { DisplayPrefsPopover } from "./display-prefs-popover";
import type { DisplayPrefs } from "./use-display-prefs";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";

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
  showGroupingSidebar?: boolean;
  onToggleGroupingSidebar?: () => void;
  onClearAll?: () => void;
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
  showGroupingSidebar = false,
  onToggleGroupingSidebar,
  onClearAll,
}: ProjectFilterBarProps) {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleViewChange = useCallback(
    (value: ViewMode) => onViewModeChange(value),
    [onViewModeChange],
  );

  const handleToggleGrouping = useCallback(() => {
    onToggleGroupingSidebar?.();
  }, [onToggleGroupingSidebar]);

  return (
    <BuildListToolbar
      search={{
        value: search,
        onValueChange: onSearchChange,
        placeholder: "Search projects…",
        label: "Search projects",
      }}
      filters={[
        {
          id: "filters",
          label: "Filters",
          control: (
            <AddFilterPopover filters={filters} onFiltersChange={onFiltersChange} />
          ),
          active: hasActiveFilters,
        },
      ]}
      trailing={
        <>
          <DisplayPrefsPopover
            prefs={prefs}
            onToggle={onTogglePrefs}
            onSet={onSetPrefs}
          />
          <ViewToggle value={viewMode} options={VIEW_OPTIONS} onChange={handleViewChange} />
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
              onClick={handleToggleGrouping}
            >
              <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
        </>
      }
      onClearAll={onClearAll}
    />
  );
}
