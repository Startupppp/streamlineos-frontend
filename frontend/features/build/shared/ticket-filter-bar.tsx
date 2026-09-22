"use client";

import {
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleCheckIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";
import { useCycles } from "@/hooks/api/build/advanced";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { FilterChip } from "@/components/list-view/filter-chip";
import { FilterTriggerButton } from "@/components/list-view/filter-trigger-button";
import type { StatusFilterOption } from "@/components/list-view/filter-types";
import {
  buildStatusConfig,
  resolveStatusOptions,
  type StatusOptionSource,
} from "@/features/build/shared/types";
import { useTicketFilterParams } from "./use-ticket-filter-params";

const FilterCommandMenu = dynamic(
  () =>
    import("./filter-command-menu").then((m) => ({
      default: m.FilterCommandMenu,
    })),
  { ssr: false },
);

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: Member[];
  statuses?: readonly StatusOptionSource[];
  projectId?: number;
  projectOptions?: ProjectOption[];
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
  className?: string;
  align?: "start" | "end";
  leading?: ReactNode;
  trailing?: ReactNode;
  mobileSearchFirst?: boolean;
}

function formatDueRange(from: string, to: string): string {
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

export function TicketFilterBar({
  sprints,
  members,
  statuses,
  projectId,
  projectOptions,
  showTypeFilter = true,
  showSprintFilter = true,
  showAssigneeFilter = true,
  showDoneToggle = false,
  hideCompleted,
  onHideCompletedChange,
  doneCount = 0,
  className,
  align = "start",
  leading,
  trailing,
  mobileSearchFirst = false,
}: TicketFilterBarProps) {
  const [filterMounted, setFilterMounted] = useState(false);
  const handleFilterOpen = useCallback(() => setFilterMounted(true), []);

  const { iconRef: hideDoneIconRef, hoverHandlers: hideDoneHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: clearAllIconRef, hoverHandlers: clearAllHoverHandlers } =
    useAnimatedIcon();

  const {
    sprintParam,
    dueDateFrom,
    dueDateTo,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    localSearch,
    activeFilterCount,
    handleSearchChange,
    handleToggleStatus,
    handleTogglePriority,
    handleToggleType,
    handleToggleAssignee,
    handleToggleLabel,
    handleToggleCycle,
    handleToggleSprint,
    handleToggleProject,
    handleDueDateFromChange,
    handleDueDateToChange,
    makeRemoveStatus,
    makeRemovePriority,
    makeRemoveType,
    makeRemoveAssignee,
    makeRemoveLabel,
    makeRemoveCycle,
    makeRemoveProject,
    handleRemoveSprint,
    handleRemoveDueDate,
    clearAll,
  } = useTicketFilterParams();

  const loadTaxonomyOptions =
    filterMounted || selectedLabels.length > 0 || selectedCycles.length > 0;
  const { data: cycles = [] } = useCycles(
    loadTaxonomyOptions ? (projectId ?? 0) : 0,
  );
  const { data: labels = [] } = useProjectLabels(projectId, {
    enabled: loadTaxonomyOptions,
  });

  const statusItems = useMemo<StatusFilterOption[]>(
    () => resolveStatusOptions(statuses),
    [statuses],
  );

  const statusConfig = useMemo(
    () => buildStatusConfig(statusItems),
    [statusItems],
  );

  const labelMap = useMemo(
    () => new Map(labels.map((l) => [String(l.id), l])),
    [labels],
  );
  const cycleMap = useMemo(
    () => new Map(cycles.map((c) => [String(c.id), c])),
    [cycles],
  );
  const memberMap = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m])),
    [members],
  );
  const projectMap = useMemo(
    () => new Map((projectOptions ?? []).map((p) => [String(p.id), p])),
    [projectOptions],
  );
  const sprintMap = useMemo(
    () => new Map((sprints ?? []).map((s) => [String(s.id), s])),
    [sprints],
  );

  const filterState = {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    sprintParam,
    dueDateFrom,
    dueDateTo,
  };

  function handleHideDoneClick() {
    onHideCompletedChange?.(!hideCompleted);
  }

  const hasFilterChips = activeFilterCount > 0;

  const searchField = (
    <div
      className={cn(
        "relative min-w-0",
        mobileSearchFirst
          ? "w-full sm:w-[220px] sm:flex-none md:w-[240px]"
          : leading
            ? "w-[min(100%,240px)] min-w-[10rem] flex-1 sm:w-[220px] sm:flex-none md:w-[240px]"
            : align === "end"
              ? "w-full max-w-[240px] min-w-[10rem] flex-1 sm:w-[220px] sm:flex-none md:w-[240px]"
              : "w-full max-w-[240px] min-w-[10rem] flex-1 sm:max-w-[220px] md:max-w-[240px]",
      )}
    >
      <SearchInput
        placeholder="Search..."
        value={localSearch}
        onValueChange={handleSearchChange}
        className="[&_svg]:left-2 [&_svg]:h-3.5 [&_svg]:w-3.5"
        inputClassName="h-9 pl-7 pr-7 text-xs"
      />
    </div>
  );

  const filterMenuProps = {
    activeFilterCount,
    statusItems,
    statusConfig,
    members: members ?? [],
    labels,
    cycles,
    sprints: sprints ?? [],
    projectOptions,
    showTypeFilter,
    showSprintFilter,
    showAssigneeFilter,
    filterState,
    onToggleStatus: handleToggleStatus,
    onTogglePriority: handleTogglePriority,
    onToggleType: handleToggleType,
    onToggleAssignee: handleToggleAssignee,
    onToggleLabel: handleToggleLabel,
    onToggleCycle: handleToggleCycle,
    onToggleSprint: handleToggleSprint,
    onToggleProject: handleToggleProject,
    onDueDateFromChange: handleDueDateFromChange,
    onDueDateToChange: handleDueDateToChange,
  };

  const filterActions = (
    <>
      {filterMounted ? (
        <FilterCommandMenu {...filterMenuProps} defaultOpen />
      ) : (
        <FilterTriggerButton
          activeFilterCount={activeFilterCount}
          onClick={handleFilterOpen}
        />
      )}

      {showDoneToggle &&
        onHideCompletedChange !== undefined &&
        hideCompleted !== undefined && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleHideDoneClick}
                  className={cn(
                    "size-9 shrink-0",
                    hideCompleted &&
                      "border-primary bg-primary/10 text-primary",
                  )}
                  aria-label={
                    doneCount > 0 ? `Hide done (${doneCount})` : "Hide done"
                  }
                  aria-pressed={hideCompleted}
                  {...hideDoneHoverHandlers}
                >
                  <CircleCheckIcon
                    ref={hideDoneIconRef}
                    size={14}
                    className={hideCompleted ? "text-primary" : undefined}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {doneCount > 0 ? `Hide done (${doneCount})` : "Hide done"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
    </>
  );

  const toolbar = mobileSearchFirst ? (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-1.5",
        align === "end" && !leading ? "sm:justify-end" : "sm:justify-start",
      )}
    >
      <div className="order-1 w-full min-w-0 sm:order-2 sm:w-auto sm:shrink-0">
        {searchField}
      </div>
      <div
        className={cn(
          "order-2 flex w-full min-w-0 items-center gap-1 sm:contents",
          !leading && "justify-end",
        )}
      >
        {leading ? (
          <div className="order-1 min-w-0 flex-1 sm:flex-none sm:shrink-0">
            {leading}
          </div>
        ) : null}
        <div className="order-3 flex shrink-0 items-center gap-0.5 sm:gap-1">
          {filterActions}
          {trailing}
        </div>
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "flex w-full min-w-0 flex-nowrap items-center gap-1 sm:gap-1.5",
        leading ? "justify-between" : align === "end" ? "sm:justify-end" : "justify-start",
      )}
    >
      {leading}
      <div
        className={cn(
          "flex min-w-0 items-center gap-0.5 sm:gap-1",
          !leading && align === "end" && "sm:justify-end",
          leading ? "shrink-0" : "flex-1",
        )}
      >
        {searchField}
        {filterActions}
        {trailing}
      </div>
    </div>
  );

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)}>
      {toolbar}

      {hasFilterChips ? (
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            {selectedStatuses.map((s) => (
              <FilterChip
                key={`status-${s}`}
                label={s.replace(/_/g, " ")}
                onRemove={makeRemoveStatus(s)}
              />
            ))}
            {selectedPriorities.map((p) => (
              <FilterChip
                key={`priority-${p}`}
                label={p.charAt(0) + p.slice(1).toLowerCase()}
                onRemove={makeRemovePriority(p)}
              />
            ))}
            {selectedTypes.map((t) => (
              <FilterChip
                key={`type-${t}`}
                label={t.charAt(0) + t.slice(1).toLowerCase()}
                onRemove={makeRemoveType(t)}
              />
            ))}
            {selectedAssignees.map((id) => {
              const member = memberMap.get(id);
              const label =
                id === "@me"
                  ? "Me"
                  : id === "__unassigned__"
                    ? "Unassigned"
                    : member
                      ? getUserDisplayName(member)
                      : id;
              return (
                <FilterChip
                  key={`assignee-${id}`}
                  label={label}
                  onRemove={makeRemoveAssignee(id)}
                />
              );
            })}
            {selectedLabels.map((id) => {
              const l = labelMap.get(id);
              return (
                <FilterChip
                  key={`label-${id}`}
                  label={l?.name ?? id}
                  color={l?.color ?? undefined}
                  onRemove={makeRemoveLabel(id)}
                />
              );
            })}
            {selectedCycles.map((id) => {
              const c = cycleMap.get(id);
              return (
                <FilterChip
                  key={`cycle-${id}`}
                  label={c?.name ?? id}
                  onRemove={makeRemoveCycle(id)}
                />
              );
            })}
            {selectedProjectIds.map((id) => {
              const p = projectMap.get(id);
              return (
                <FilterChip
                  key={`project-${id}`}
                  label={p?.name ?? id}
                  onRemove={makeRemoveProject(id)}
                />
              );
            })}
            {sprintParam ? (
              <FilterChip
                key={`sprint-${sprintParam}`}
                label={sprintMap.get(sprintParam)?.name ?? `Sprint ${sprintParam}`}
                onRemove={handleRemoveSprint}
              />
            ) : null}
            {dueDateFrom || dueDateTo ? (
              <FilterChip
                key="due-date"
                label={formatDueRange(dueDateFrom, dueDateTo)}
                onRemove={handleRemoveDueDate}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Clear all filters"
            {...clearAllHoverHandlers}
          >
            <XIcon ref={clearAllIconRef} size={12} className="shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
