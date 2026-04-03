"use client";

import { Search, LayoutGrid, TableIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "./leads-constants";

interface LeadsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  view: "table" | "kanban";
  onViewChange: (view: "table" | "kanban") => void;
  // Filter props (only relevant in table view)
  statusFilter?: string;
  priorityFilter?: string;
  sourceFilter?: string;
  onStatusFilterChange: (value: string | undefined) => void;
  onPriorityFilterChange: (value: string | undefined) => void;
  onSourceFilterChange: (value: string | undefined) => void;
  onClearFilters: () => void;
}

export function LeadsToolbar({
  searchQuery,
  onSearchChange,
  view,
  onViewChange,
  statusFilter,
  priorityFilter,
  sourceFilter,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSourceFilterChange,
  onClearFilters,
}: LeadsToolbarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 max-w-sm min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center border border-border rounded-md">
        <Button
          variant={view === "table" ? "default" : "ghost"}
          size="sm"
          className={cn("rounded-r-none", view === "table" && "bg-gold hover:bg-gold/80 text-white")}
          onClick={() => onViewChange("table")}
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          className={cn("rounded-l-none", view === "kanban" && "bg-gold hover:bg-gold/80 text-white")}
          onClick={() => onViewChange("kanban")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters — shown only in table view */}
      {view === "table" && (
        <>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => onStatusFilterChange(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter || "all"}
            onValueChange={(v) => onPriorityFilterChange(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Priority</SelectItem>
              {LEAD_PRIORITIES.map(p => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sourceFilter || "all"}
            onValueChange={(v) => onSourceFilterChange(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Sources</SelectItem>
              {LEAD_SOURCES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter || priorityFilter || sourceFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </>
      )}
    </div>
  );
}
