"use client";

import { useCallback } from "react";
import { LayoutGrid, List } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
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
    <div className={cn(FILTER_TOOLBAR_ROW, "gap-1.5 sm:gap-2")}>
      <div className="w-[200px] max-w-[min(240px,70vw)] sm:w-[240px]">
        <SearchInput
          placeholder="Search projects…"
          value={search}
          onValueChange={onSearchChange}
          aria-label="Search projects"
        />
      </div>

      <Select value={status} onValueChange={handleStatusValueChange}>
        <SelectTrigger className="w-[132px] text-xs">
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
        className="ml-auto shrink-0"
      />
    </div>
  );
}
