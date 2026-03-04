"use client";

import { Search, X, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All Projects" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ProjectFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: ProjectFilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects by name or key..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-10"
          aria-label="Search projects"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status chip buttons */}
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={status === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(opt.value)}
              className={
                status === opt.value
                  ? "bg-gold text-white hover:bg-gold/90 border-gold"
                  : "text-muted-foreground"
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* View toggle */}
        <div
          className="flex items-center border border-border rounded-md overflow-hidden"
          role="radiogroup"
          aria-label="View mode"
        >
          <button
            role="radio"
            aria-checked={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={`p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-gold text-white"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            role="radio"
            aria-checked={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            className={`p-2 transition-colors ${
              viewMode === "list"
                ? "bg-gold text-white"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
