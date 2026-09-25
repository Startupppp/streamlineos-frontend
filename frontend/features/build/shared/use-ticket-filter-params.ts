"use client";

import { useMemo } from "react";
import { useListFilterParams, type ListFilterSpec } from "@/components/list-view";

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const VALID_TICKET_TYPES = new Set(["TASK", "BUG", "STORY", "EPIC", "SUBTASK"]);

/**
 * Build's declaration, and the first caller of the shared list-filter hook. The
 * categories below used to be a closed union inside the hook itself, which
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
    const selectedPriorities = group("priority")
      .map((value) => value.toUpperCase())
      .filter((value) => VALID_PRIORITIES.has(value));
    const selectedTypes = group("type")
      .map((value) => value.toUpperCase())
      .filter((value) => VALID_TICKET_TYPES.has(value));
    const invalidCategoryCount = [
      group("priority").length > 0 && selectedPriorities.length === 0,
      group("type").length > 0 && selectedTypes.length === 0,
    ].filter(Boolean).length;
    const makeRemove = (key: string) => (value: string) =>
      function onRemove() {
        remove(key, value);
      };

    return {
      q: filters.search,
      dueDateFrom: values["dates"]?.[0] ?? "",
      dueDateTo: values["dates"]?.[1] ?? "",
      selectedStatuses: group("status"),
      selectedPriorities,
      selectedTypes,
      selectedAssignees: group("assignee"),
      selectedLabels: group("label"),
      selectedCycles: group("cycle"),
      selectedProjectIds: group("project"),
      localSearch: filters.localSearch,
      activeFilterCount: Math.max(0, filters.activeFilterCount - invalidCategoryCount),
      handleSearchChange: filters.setSearch,
      handleToggleStatus: (status: string) => toggle("status", status),
      handleTogglePriority: (priority: string) => toggle("priority", priority),
      handleToggleType: (type: string) => toggle("type", type),
      handleToggleAssignee: (id: string) => toggle("assignee", id),
      handleToggleLabel: (id: string) => toggle("label", id),
      handleToggleCycle: (id: string) => toggle("cycle", id),
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
      handleRemoveDueDate: () => clearCategory("dates"),
      clearAll: filters.clearAll,
    };
  }, [filters, values, toggle, setAt, remove, clearCategory]);
}
