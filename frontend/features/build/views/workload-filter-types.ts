import type { FilterState } from "./workload-types";

export interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

export interface StatusOption {
  name: string;
  color: string | null;
  type?: string | null;
}

export interface SprintOption {
  id: number;
  name: string;
}

export interface CycleOption {
  id: number;
  name: string;
}

export interface WorkloadFilterMenuProps {
  filters: FilterState;
  members: WorkloadMember[];
  sprints: SprintOption[];
  cycles: CycleOption[];
  projectStatuses?: StatusOption[];
  activeFilterCount: number;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

export type WorkloadFilterCategory =
  | "sprint"
  | "cycle"
  | "priority"
  | "type"
  | "status"
  | "assignee";

export type StringFilterKey =
  | "sprintId"
  | "cycleId"
  | "priority"
  | "type"
  | "status"
  | "assigneeId";

export const TICKET_TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;
export const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export function formatEnumLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
