import type { PersonSummary } from "@/components/shared/person-drawer";

export type ActionCenterSource = "leave" | "wfh" | "attendance" | "workflow";

export type ActionCenterFacet = "leave" | "wfh" | "attendance" | "other";

export const ACTION_CENTER_FACETS: readonly {
  value: ActionCenterFacet | "all";
  label: string;
}[] = [
  { value: "all", label: "All types" },
  { value: "leave", label: "Leave" },
  { value: "wfh", label: "WFH" },
  { value: "attendance", label: "Attendance" },
  { value: "other", label: "Other" },
];

export interface ActionCenterItem {
  readonly id: string;
  readonly source: ActionCenterSource;
  readonly sourceId: number;
  readonly facet: ActionCenterFacet;
  readonly type: string;
  readonly requester: PersonSummary | null;
  readonly requesterLabel: string;
  readonly dateRange: string;
  readonly startDay: string | null;
  readonly submittedAt: string | null;
  readonly policyNote: string | null;
  readonly deadlineAffected: boolean;
  readonly detailHref: string | null;
}

export interface ActionCenterFilterState {
  readonly facet: ActionCenterFacet | "all";
  readonly onlyCutoff: boolean;
}

export const ACTION_CENTER_NO_FILTERS: ActionCenterFilterState = {
  facet: "all",
  onlyCutoff: false,
};

export function filtersActive(state: ActionCenterFilterState): boolean {
  return state.facet !== "all" || state.onlyCutoff;
}

export function filterQueueItems(
  items: readonly ActionCenterItem[],
  state: ActionCenterFilterState,
): ActionCenterItem[] {
  return items.filter((item) => {
    if (state.facet !== "all" && item.facet !== state.facet) return false;
    if (state.onlyCutoff && !item.deadlineAffected) return false;
    return true;
  });
}

export function bulkGroupKey(item: ActionCenterItem): string {
  return `${item.source}:${item.type}`;
}

export function sharedBulkGroup(
  items: readonly ActionCenterItem[],
): string | null {
  if (items.length === 0) return null;
  const first = bulkGroupKey(items[0]);
  return items.every((item) => bulkGroupKey(item) === first) ? first : null;
}

export function sortQueueItems(
  items: readonly ActionCenterItem[],
): ActionCenterItem[] {
  return [...items].sort((left, right) => {
    if (left.deadlineAffected !== right.deadlineAffected)
      return left.deadlineAffected ? -1 : 1;
    const leftAt = left.submittedAt ?? "";
    const rightAt = right.submittedAt ?? "";
    if (leftAt !== rightAt) return leftAt < rightAt ? -1 : 1;
    return left.id < right.id ? -1 : 1;
  });
}
