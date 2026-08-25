"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
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
    <div className={FILTER_TOOLBAR_ROW}>
        <SearchInput placeholder="Search tasks..." value={search} onValueChange={handleSearchChange} />

      <Select value={typeFilter || "all"} onValueChange={handleTypeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="CALL">Call</SelectItem>
          <SelectItem value="EMAIL">Email</SelectItem>
          <SelectItem value="MEETING">Meeting</SelectItem>
          <SelectItem value="CUSTOM">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={entityTypeFilter || "all"} onValueChange={handleEntityTypeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}>
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          <SelectItem value="LEAD">Lead</SelectItem>
          <SelectItem value="DEAL">Deal</SelectItem>
          <SelectItem value="CONTACT">Contact</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assigneeFilter || "all"} onValueChange={handleAssigneeFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[130px]")}>
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name ?? m.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="text-dense px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
