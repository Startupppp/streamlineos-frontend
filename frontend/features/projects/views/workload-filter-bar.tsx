"use client";

import { memo, useCallback, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { InfoIcon, XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/features/projects/shared/filter-chips";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { useSprints } from "@/hooks/api/projects/sprints";
import { useCycles } from "@/hooks/api/projects/advanced";
import { WorkloadFilterMenu } from "./workload-filter-menu";
import type { FilterState } from "./workload-types";
import { hasActiveWorkloadFilters } from "./workload-types";

interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface WorkloadFilterBarProps {
  projectId: number;
  filters: FilterState;
  members: WorkloadMember[];
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearFilters: () => void;
  className?: string;
}

function countBarFilters(filters: FilterState): number {
  let count = 0;
  if (filters.sprintId !== "all") count += 1;
  if (filters.cycleId !== "all") count += 1;
  if (filters.priority !== "all") count += 1;
  if (filters.type !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.assigneeId !== "all") count += 1;
  return count;
}

function formatEnumLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export const WorkloadFilterBar = memo(function WorkloadFilterBar({
  projectId,
  filters,
  members,
  projectStatuses,
  onFilterChange,
  onClearFilters,
  className,
}: WorkloadFilterBarProps) {
  const { data: sprints = [] } = useSprints(projectId);
  const { data: cycles = [] } = useCycles(projectId);
  const hasActiveFilters = hasActiveWorkloadFilters(filters);
  const activeFilterCount = countBarFilters(filters);

  const sprintMap = useMemo(() => new Map(sprints.map((s) => [String(s.id), s])), [sprints]);
  const cycleMap = useMemo(() => new Map(cycles.map((c) => [String(c.id), c])), [cycles]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const assigneeChipLabel = useMemo(() => {
    if (filters.assigneeId === "all") return "";
    const member = memberMap.get(filters.assigneeId);
    return member ? getUserDisplayName(member) : filters.assigneeId;
  }, [filters.assigneeId, memberMap]);

  const handleClearSprint = useCallback(() => {
    onFilterChange("sprintId", "all");
  }, [onFilterChange]);

  const handleClearCycle = useCallback(() => {
    onFilterChange("cycleId", "all");
  }, [onFilterChange]);

  const handleClearPriority = useCallback(() => {
    onFilterChange("priority", "all");
  }, [onFilterChange]);

  const handleClearType = useCallback(() => {
    onFilterChange("type", "all");
  }, [onFilterChange]);

  const handleClearStatus = useCallback(() => {
    onFilterChange("status", "all");
  }, [onFilterChange]);

  const handleClearAssignee = useCallback(() => {
    onFilterChange("assigneeId", "all");
  }, [onFilterChange]);

  const { iconRef: clearIconRef, hoverHandlers: clearHoverHandlers } = useAnimatedIcon();
  const { iconRef: infoIconRef, hoverHandlers: infoHoverHandlers } = useAnimatedIcon();

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
        <WorkloadFilterMenu
          filters={filters}
          members={members}
          sprints={sprints}
          cycles={cycles}
          projectStatuses={projectStatuses}
          activeFilterCount={activeFilterCount}
          onFilterChange={onFilterChange}
        />

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
            {...clearHoverHandlers}
          >
            <XIcon ref={clearIconRef} size={12} className="shrink-0" />
            Clear all
          </button>
        ) : null}

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="About workload metrics"
                {...infoHoverHandlers}
              >
                <InfoIcon ref={infoIconRef} size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[16rem] text-xs">
              Workload shows ticket count per member. Points are summed where set.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {activeFilterCount > 0 ? (
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          {filters.sprintId !== "all" ? (
            <FilterChip
              label={sprintMap.get(filters.sprintId)?.name ?? filters.sprintId}
              onRemove={handleClearSprint}
            />
          ) : null}
          {filters.cycleId !== "all" ? (
            <FilterChip
              label={cycleMap.get(filters.cycleId)?.name ?? filters.cycleId}
              onRemove={handleClearCycle}
            />
          ) : null}
          {filters.priority !== "all" ? (
            <FilterChip
              label={formatEnumLabel(filters.priority)}
              onRemove={handleClearPriority}
            />
          ) : null}
          {filters.type !== "all" ? (
            <FilterChip label={formatEnumLabel(filters.type)} onRemove={handleClearType} />
          ) : null}
          {filters.status !== "all" ? (
            <FilterChip
              label={filters.status.replace(/_/g, " ")}
              onRemove={handleClearStatus}
            />
          ) : null}
          {filters.assigneeId !== "all" ? (
            <FilterChip label={assigneeChipLabel} onRemove={handleClearAssignee} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
