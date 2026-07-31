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

export interface Sprint {
  id: number;
  name: string;
}

export interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

export type FilterCategory =
  | "status"
  | "priority"
  | "type"
  | "assignee"
  | "label"
  | "cycle"
  | "sprint"
  | "dates"
  | "project";

export interface StatusFilterOption {
  name: string;
  color: string | null;
  type?: string | null;
}

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

export const FILTER_CATEGORY_TITLES: Record<FilterCategory, string> = {
  status: "Status",
  priority: "Priority",
  type: "Type",
  assignee: "Assignee",
  label: "Label",
  cycle: "Cycle",
  sprint: "Sprint",
  dates: "Due Dates",
  project: "Project",
};

export interface FilterState {
  selectedStatuses: string[];
  selectedPriorities: string[];
  selectedTypes: string[];
  selectedAssignees: string[];
  selectedLabels: string[];
  selectedCycles: string[];
  selectedProjectIds: string[];
  sprintParam: string;
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
