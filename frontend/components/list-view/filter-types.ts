import type { ReactNode } from "react";

export interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

export interface Label {
  id: number;
  name: string;
  color?: string | null;
}

export interface Cycle {
  id: number;
  name: string;
}

export interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

/**
 * Open on purpose. The filter controls are generic over the category set; the
 * closed union below is Build's own list, not the platform's, and keeping the
 * two apart is what lets another module reuse these controls.
 */
export type FilterCategory = string;

export type BuildFilterCategory =
  | "status"
  | "priority"
  | "type"
  | "assignee"
  | "label"
  | "cycle"
  | "dates"
  | "project";

export interface StatusFilterOption {
  name: string;
  color: string | null;
  type?: string | null;
}

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

/** `satisfies` keeps Build's nine exhaustive; the wider type lets any key be looked up. */
const BUILD_CATEGORY_TITLES = {
  status: "Status",
  priority: "Priority",
  type: "Type",
  assignee: "Assignee",
  label: "Label",
  cycle: "Cycle",
  dates: "Due Dates",
  project: "Project",
} satisfies Record<BuildFilterCategory, string>;

export const FILTER_CATEGORY_TITLES: Record<string, string> = BUILD_CATEGORY_TITLES;

/** Falls back to the key itself, because an open category set has no exhaustive title map. */
export function categoryTitle(category: FilterCategory): string {
  return FILTER_CATEGORY_TITLES[category] ?? category;
}

export interface FilterState {
  selectedStatuses: string[];
  selectedPriorities: string[];
  selectedTypes: string[];
  selectedAssignees: string[];
  selectedLabels: string[];
  selectedCycles: string[];
  selectedProjectIds: string[];
  dueDateFrom: string;
  dueDateTo: string;
}

export interface CategoryDefinition {
  key: FilterCategory;
  label: string;
  leading?: ReactNode;
  visible: boolean;
  activeCount: number;
}
