"use client";

import { useCallback, type ChangeEvent } from "react";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

const VIEW_OPTIONS: ViewOption<ViewMode>[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
  { value: "list", icon: List, label: "List view" },
];

interface ProjectFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ProjectFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: ProjectFilterBarProps) {
  const handleSearchInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  const handleClearSearch = useCallback(
    () => onSearchChange(""),
    [onSearchChange],
  );

  const handleStatusValueChange = useCallback(
    (value: string) => {
      if (
        value === "ALL" ||
        value === "ACTIVE" ||
        value === "COMPLETED" ||
        value === "ARCHIVED"
      ) {
        onStatusChange(value);
      }
    },
    [onStatusChange],
  );

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Search projects…"
          value={search}
          onChange={handleSearchInputChange}
          className={cn(
            "h-8 border-border/60 bg-background/50 pl-8 pr-7 text-xs shadow-none",
            "placeholder:text-muted-foreground/70 focus-visible:bg-background/80",
          )}
          aria-label="Search projects"
        />
        {search ? (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <Select value={status} onValueChange={handleStatusValueChange}>
        <SelectTrigger
          className={cn(
            "h-8 w-full border-border/60 bg-background/50 text-xs shadow-none sm:w-[132px]",
            "focus:bg-background/80",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <ViewToggle
        value={viewMode}
        options={VIEW_OPTIONS}
        onChange={onViewModeChange}
        size="sm"
        className="ml-auto shrink-0 border-border/60 bg-background/40"
      />
    </div>
  );
}
