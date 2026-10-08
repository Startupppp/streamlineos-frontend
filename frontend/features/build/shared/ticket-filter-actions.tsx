"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleCheckIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { FilterTriggerButton } from "@/components/list-view/filter-trigger-button";
import {
  buildStatusConfig,
  resolveStatusOptions,
  type StatusOptionSource,
} from "@/features/build/shared/types";
import { useTicketFilterParams } from "./use-ticket-filter-params";
import type { Member, ProjectOption } from "./ticket-filter-chips";

const FilterCommandMenu = dynamic(
  () =>
    import("./filter-command-menu").then((m) => ({
      default: m.FilterCommandMenu,
    })),
  { ssr: false },
);

interface TicketFilterActionsProps {
  presentation: "default" | "all-work";
  statuses?: readonly StatusOptionSource[];
  members?: Member[];
  projectId?: number;
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  showDoneToggle: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount: number;
}

export function TicketFilterActions({
  presentation,
  statuses,
  members = [],
  projectId,
  projectOptions,
  showTypeFilter,
  showAssigneeFilter,
  showDoneToggle,
  hideCompleted,
  onHideCompletedChange,
  doneCount,
}: TicketFilterActionsProps) {
  const [filterMounted, setFilterMounted] = useState(false);
  const handleFilterOpen = useCallback(() => setFilterMounted(true), []);
  const { iconRef: hideDoneIconRef, hoverHandlers: hideDoneHoverHandlers } =
    useAnimatedIcon();

  const {
    activeFilterCount,
    selectedLabels,
    selectedCycles,
    dueDateFrom,
    dueDateTo,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedProjectIds,
    handleToggleStatus,
    handleTogglePriority,
    handleToggleType,
    handleToggleAssignee,
    handleToggleLabel,
    handleToggleCycle,
    handleToggleProject,
    handleDueDateFromChange,
    handleDueDateToChange,
  } = useTicketFilterParams();

  const loadTaxonomy =
    filterMounted || selectedLabels.length > 0 || selectedCycles.length > 0;
  const { data: cycles = [] } = useCycles(loadTaxonomy ? (projectId ?? 0) : 0);
  const { data: labels = [] } = useProjectLabels(projectId, {
    enabled: loadTaxonomy,
  });

  const statusItems = useMemo(
    () => resolveStatusOptions(statuses),
    [statuses],
  );
  const statusConfig = useMemo(
    () => buildStatusConfig(statusItems),
    [statusItems],
  );

  const filterState = {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
  };

  const filterMenuProps = {
    activeFilterCount,
    presentation,
    simplifySingleOptionCategories: true,
    triggerLabel: presentation === "all-work" ? "Filters" : "Add filter",
    statusItems,
    statusConfig,
    members,
    labels,
    cycles,
    projectOptions,
    showTypeFilter,
    showAssigneeFilter,
    filterState,
    onToggleStatus: handleToggleStatus,
    onTogglePriority: handleTogglePriority,
    onToggleType: handleToggleType,
    onToggleAssignee: handleToggleAssignee,
    onToggleLabel: handleToggleLabel,
    onToggleCycle: handleToggleCycle,
    onToggleProject: handleToggleProject,
    onDueDateFromChange: handleDueDateFromChange,
    onDueDateToChange: handleDueDateToChange,
  };

  function handleHideDoneClick() {
    onHideCompletedChange?.(!hideCompleted);
  }

  return (
    <>
      {filterMounted ? (
        <FilterCommandMenu {...filterMenuProps} defaultOpen />
      ) : (
        <FilterTriggerButton
          activeFilterCount={activeFilterCount}
          label={presentation === "all-work" ? "Filters" : "Add filter"}
          showLabelOnMobile={presentation === "all-work"}
          onClick={handleFilterOpen}
          className={cn(
            presentation === "all-work" &&
              "h-9 w-auto min-w-28 rounded-lg border-border/80 bg-muted/45 px-3 font-medium shadow-sm hover:border-primary/35 hover:bg-muted/70",
          )}
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
}
