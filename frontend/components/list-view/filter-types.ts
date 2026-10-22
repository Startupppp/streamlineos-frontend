import type { ReactNode } from "react";
import { DB_ENUMS } from "@/contracts/db-enums.generated";

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
export const TYPES = DB_ENUMS.ticket_type;

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
  directAction?: () => void;
}
