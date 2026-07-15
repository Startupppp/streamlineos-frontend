"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

interface TasksToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  entityTypeFilter: string;
  onEntityTypeFilterChange: (v: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (v: string) => void;
  members: Array<{ id: string; name: string | null }>;
  onClearFilters: () => void;
}

export function TasksToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  entityTypeFilter,
  onEntityTypeFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  members,
  onClearFilters,
}: TasksToolbarProps) {
  const handleSearchChange = useCallback(
    (value: string) => onSearchChange(value),
    [onSearchChange],
  );
  const handleTypeFilter = useCallback(
    (v: string) => onTypeFilterChange(v === "all" ? "" : v),
    [onTypeFilterChange],
  );
  const handleStatusFilter = useCallback(
    (v: string) => onStatusFilterChange(v === "all" ? "" : v),
    [onStatusFilterChange],
  );
  const handleEntityTypeFilter = useCallback(
    (v: string) => onEntityTypeFilterChange(v === "all" ? "" : v),
    [onEntityTypeFilterChange],
  );
  const handleAssigneeFilter = useCallback(
    (v: string) => onAssigneeFilterChange(v === "all" ? "" : v),
    [onAssigneeFilterChange],
  );

  const hasFilters = !!(typeFilter || statusFilter || entityTypeFilter || assigneeFilter || search);

  return (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <div className="min-w-0 flex-1 min-w-[140px] sm:flex-none sm:w-[180px] sm:max-w-xs">
          <SearchInput placeholder="Search tasks..." value={search} onValueChange={handleSearchChange} />
        </div>

      <Select value={typeFilter || "all"} onValueChange={handleTypeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px] text-[11px]")}>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-[11px]">All Types</SelectItem>
          <SelectItem value="CALL" className="text-[11px]">Call</SelectItem>
          <SelectItem value="EMAIL" className="text-[11px]">Email</SelectItem>
          <SelectItem value="MEETING" className="text-[11px]">Meeting</SelectItem>
          <SelectItem value="CUSTOM" className="text-[11px]">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px] text-[11px]")}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-[11px]">All Status</SelectItem>
          <SelectItem value="pending" className="text-[11px]">Pending</SelectItem>
          <SelectItem value="completed" className="text-[11px]">Completed</SelectItem>
          <SelectItem value="cancelled" className="text-[11px]">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={entityTypeFilter || "all"} onValueChange={handleEntityTypeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px] text-[11px]")}>
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-[11px]">All Entities</SelectItem>
          <SelectItem value="LEAD" className="text-[11px]">Lead</SelectItem>
          <SelectItem value="DEAL" className="text-[11px]">Deal</SelectItem>
          <SelectItem value="CONTACT" className="text-[11px]">Contact</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assigneeFilter || "all"} onValueChange={handleAssigneeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[130px] text-[11px]")}>
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-[11px]">All Assignees</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id} className="text-[11px]">
              {m.name ?? m.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="text-[11px] px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
