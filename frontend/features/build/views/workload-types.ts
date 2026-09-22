export type StatFilter = "all" | "assigned" | "unassigned" | "over-capacity";

export interface MemberCapacityData {
  capacityHours: number | null;
  loggedHours: number;
  isOverAllocated: boolean;
  isZeroCapacity: boolean;
  utilizationPercent: number | null;
}

export function isMemberOverCapacity(
  ticketCount: number,
  capacityData: MemberCapacityData | undefined,
): boolean {
  if (capacityData !== undefined) return capacityData.isOverAllocated;
  return ticketCount > 5;
}

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

export function hasActiveWorkloadFilters(filters: FilterState): boolean {
  return (
    filters.sprintId !== "all" ||
    filters.cycleId !== "all" ||
    filters.priority !== "all" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.assigneeId !== "all" ||
    filters.statCard !== "all"
  );
}
