"use client";

import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import type { Sprint } from "@/types/projects";
import type { Cycle } from "@/types/projects";
import type { FilterState } from "./workload-types";

interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface WorkloadFilterBarProps {
  filters: FilterState;
  sprints: Sprint[];
  cycles: Cycle[];
  members: WorkloadMember[];
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  hasActiveFilters: boolean;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearFilters: () => void;
}

const TICKET_TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export const WorkloadFilterBar = memo(function WorkloadFilterBar({
  filters,
  sprints,
  cycles,
  members,
  projectStatuses,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: WorkloadFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <Select value={filters.sprintId} onValueChange={(v) => onFilterChange("sprintId", v)}>
        <SelectTrigger className="h-7 text-[11px] w-32">
          <SelectValue placeholder="Sprint" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sprints</SelectItem>
          {sprints.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.cycleId} onValueChange={(v) => onFilterChange("cycleId", v)}>
        <SelectTrigger className="h-7 text-[11px] w-32">
          <SelectValue placeholder="Cycle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cycles</SelectItem>
          {cycles.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onFilterChange("priority", v)}>
        <SelectTrigger className="h-7 text-[11px] w-28">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => onFilterChange("type", v)}>
        <SelectTrigger className="h-7 text-[11px] w-24">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TICKET_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {projectStatuses && projectStatuses.length > 0 && (
        <Select value={filters.status} onValueChange={(v) => onFilterChange("status", v)}>
          <SelectTrigger className="h-7 text-[11px] w-28">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {projectStatuses.map((s) => (
              <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.assigneeId} onValueChange={(v) => onFilterChange("assigneeId", v)}>
        <SelectTrigger className="h-7 text-[11px] w-32">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All members</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>{getUserDisplayName(m)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          type="button"
          className="h-7 text-[11px] px-2 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="h-3 w-3 shrink-0" />
        <span>Workload shows ticket count per member. Points are summed where set.</span>
      </div>
    </div>
  );
});
