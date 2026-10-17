import type { ReactNode } from "react";
import {
  type StatusFilterOption,
  type Label,
  type Cycle,
  type ProjectOption,
  type FilterState,
  type CategoryDefinition,
} from "@/components/list-view";

interface BuildFilterCategoriesParams {
  simplifySingleOptionCategories: boolean;
  assigneeLeading?: ReactNode;
  statusItems: StatusFilterOption[];
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  labels: Label[];
  cycles: Cycle[];
  projectOptions?: ProjectOption[];
  filterState: Omit<FilterState, "sprintParam">;
  onToggleStatus: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleProject: (value: string) => void;
}

function singleOptionAction(
  simplifySingleOptionCategories: boolean,
  values: readonly { id: string | number }[],
  onToggle: (value: string) => void,
): (() => void) | undefined {
  if (!simplifySingleOptionCategories || values.length !== 1) return undefined;
  const only = values[0];
  if (!only) return undefined;
  return () => onToggle(String(only.id));
}

export function buildFilterCategories({
  simplifySingleOptionCategories,
  assigneeLeading,
  statusItems,
  showTypeFilter,
  showAssigneeFilter,
  labels,
  cycles,
  projectOptions,
  filterState,
  onToggleStatus,
  onToggleLabel,
  onToggleCycle,
  onToggleProject,
}: BuildFilterCategoriesParams): CategoryDefinition[] {
  const {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
  } = filterState;

  const onlyStatus = statusItems.length === 1 ? statusItems[0] : undefined;
  const singleStatusAction =
    simplifySingleOptionCategories && onlyStatus
      ? () => onToggleStatus(onlyStatus.name)
      : undefined;

  return [
    {
      key: "status",
      label: "Status",
      visible: true,
      activeCount: selectedStatuses.length,
      directAction: singleStatusAction,
    },
    {
      key: "priority",
      label: "Priority",
      visible: true,
      activeCount: selectedPriorities.length,
    },
    {
      key: "type",
      label: "Type",
      visible: showTypeFilter,
      activeCount: selectedTypes.length,
    },
    {
      key: "assignee",
      label: "Assignee",
      leading: assigneeLeading,
      visible: showAssigneeFilter,
      activeCount: selectedAssignees.length,
    },
    {
      key: "label",
      label: "Label",
      visible: labels.length > 0,
      activeCount: selectedLabels.length,
      directAction: singleOptionAction(simplifySingleOptionCategories, labels, onToggleLabel),
    },
    {
      key: "cycle",
      label: "Cycle",
      visible: cycles.length > 0,
      activeCount: selectedCycles.length,
      directAction: singleOptionAction(simplifySingleOptionCategories, cycles, onToggleCycle),
    },
    {
      key: "dates",
      label: "Due Dates",
      visible: true,
      activeCount: dueDateFrom || dueDateTo ? 1 : 0,
    },
    {
      key: "project",
      label: "Project",
      visible: (projectOptions?.length ?? 0) > 0,
      activeCount: selectedProjectIds.length,
      directAction: singleOptionAction(simplifySingleOptionCategories, projectOptions ?? [], onToggleProject),
    },
  ];
}
