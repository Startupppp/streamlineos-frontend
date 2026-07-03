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
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

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

  const handleGridViewClick = useCallback(
    () => onViewModeChange("grid"),
    [onViewModeChange],
  );

  const handleListViewClick = useCallback(
    () => onViewModeChange("list"),
    [onViewModeChange],
  );

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={handleSearchInputChange}
          className="h-8 pl-8 pr-7 text-xs"
          aria-label="Search projects"
        />
        {search && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Select value={status} onValueChange={handleStatusValueChange}>
        <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center rounded-md border bg-muted/50 p-0.5 ml-auto shrink-0">
        <button
          onClick={handleGridViewClick}
          className={cn(
            "inline-flex items-center justify-center rounded px-2 py-1 transition-all",
            viewMode === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleListViewClick}
          className={cn(
            "inline-flex items-center justify-center rounded px-2 py-1 transition-all",
            viewMode === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
