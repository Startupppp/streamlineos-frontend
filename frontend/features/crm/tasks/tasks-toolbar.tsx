"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
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
      <div className="relative flex-1 min-w-[140px] sm:flex-none sm:w-[180px] sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={handleSearchChange}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Select value={typeFilter || "all"} onValueChange={handleTypeFilter}>
        <SelectTrigger className="w-[110px] h-8 text-[11px]">
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
        <SelectTrigger className="w-[110px] h-8 text-[11px]">
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
        <SelectTrigger className="w-[110px] h-8 text-[11px]">
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
        <SelectTrigger className="w-[130px] h-8 text-[11px]">
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
        <Button variant="ghost" size="sm" className="h-8 text-[11px] px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
