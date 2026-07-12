export type StatFilter = "all" | "assigned" | "unassigned" | "over-capacity";

export interface FilterState {
  statCard: StatFilter;
  sprintId: string;
  cycleId: string;
  priority: string;
  type: string;
  status: string;
  assigneeId: string;
  showUnassigned: boolean;
}

export const INITIAL_FILTERS: FilterState = {
  statCard: "all",
  sprintId: "all",
  cycleId: "all",
  priority: "all",
  type: "all",
  status: "all",
  assigneeId: "all",
  showUnassigned: true,
};
