"use client";

import { useMemo } from "react";
import { useListFilterParams, type ListFilterSpec } from "@/features/shared/list-view";

/**
 * Build's declaration, and the first caller of the shared list-filter hook. The
 * nine categories below used to be a closed union inside the hook itself, which
 * is why no other module could reach any of this.
 */
export const TICKET_FILTER_SPEC: ListFilterSpec = {
  categories: [
    { key: "status", label: "Status", arity: "multi", params: ["status"] },
    { key: "priority", label: "Priority", arity: "multi", params: ["priority"] },
    { key: "type", label: "Type", arity: "multi", params: ["type"] },
    { key: "assignee", label: "Assignee", arity: "multi", params: ["assigneeId"] },
    { key: "label", label: "Label", arity: "multi", params: ["labels"] },
    { key: "cycle", label: "Cycle", arity: "multi", params: ["cycle"] },
    { key: "project", label: "Project", arity: "multi", params: ["projectIds"] },
    { key: "sprint", label: "Sprint", arity: "single", params: ["sprintId"] },
    {
      key: "dates",
      label: "Due Dates",
      arity: "range",
      params: ["dueDateFrom", "dueDateTo"],
    },
  ],
};

export function useTicketFilterParams() {
  const filters = useListFilterParams(TICKET_FILTER_SPEC);
  const { values, toggle, setAt, remove, clearCategory } = filters;

  return useMemo(() => {
    const group = (key: string): string[] => [...(values[key] ?? [])];
    const makeRemove = (key: string) => (value: string) =>
      function onRemove() {
        remove(key, value);
      };

    return {
      q: filters.search,
      sprintParam: values["sprint"]?.[0] ?? "",
      dueDateFrom: values["dates"]?.[0] ?? "",
      dueDateTo: values["dates"]?.[1] ?? "",
      selectedStatuses: group("status"),
      selectedPriorities: group("priority"),
      selectedTypes: group("type"),
      selectedAssignees: group("assignee"),
      selectedLabels: group("label"),
      selectedCycles: group("cycle"),
      selectedProjectIds: group("project"),
      localSearch: filters.localSearch,
      activeFilterCount: filters.activeFilterCount,
      handleSearchChange: filters.setSearch,
      handleToggleStatus: (status: string) => toggle("status", status),
      handleTogglePriority: (priority: string) => toggle("priority", priority),
      handleToggleType: (type: string) => toggle("type", type),
      handleToggleAssignee: (id: string) => toggle("assignee", id),
      handleToggleLabel: (id: string) => toggle("label", id),
      handleToggleCycle: (id: string) => toggle("cycle", id),
      handleToggleSprint: (id: string) => toggle("sprint", id),
      handleToggleProject: (id: string) => toggle("project", id),
      handleDueDateFromChange: (value: string) => setAt("dates", 0, value),
      handleDueDateToChange: (value: string) => setAt("dates", 1, value),
      makeRemoveStatus: makeRemove("status"),
      makeRemovePriority: makeRemove("priority"),
      makeRemoveType: makeRemove("type"),
      makeRemoveAssignee: makeRemove("assignee"),
      makeRemoveLabel: makeRemove("label"),
      makeRemoveCycle: makeRemove("cycle"),
      makeRemoveProject: makeRemove("project"),
      handleRemoveSprint: () => clearCategory("sprint"),
      handleRemoveDueDate: () => clearCategory("dates"),
      clearAll: filters.clearAll,
    };
  }, [filters, values, toggle, setAt, remove, clearCategory]);
}
