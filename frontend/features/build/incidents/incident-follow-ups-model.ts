import type { IncidentFollowUpStatus } from "@/hooks/api/build/incidents-schema";
import type { IncidentsAddFollowUpActionResponse } from "@/contracts/build-contracts.generated";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

export function isIncidentFollowUpStatus(value: string): value is IncidentFollowUpStatus {
  return Object.hasOwn(FOLLOW_UP_STATUS_LABELS, value);
}

export const FOLLOW_UP_STATUS_LABELS: Record<IncidentFollowUpStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const FOLLOW_UP_STATUS_STYLES: Record<IncidentFollowUpStatus, string> = {
  open: "text-status-danger-ink-strong border-status-danger-rule",
  in_progress: "text-status-warning-ink-strong border-status-warning-rule",
  done: "text-status-success-ink-strong border-status-success-rule",
  cancelled: "text-muted-foreground border-border",
};

export const FOLLOW_UP_STATUSES: IncidentFollowUpStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

export const STATUS_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

export const STATUS_FILTER_DEFINITIONS = [
  { param: "followUpStatus", options: ["open", "in_progress", "done", "cancelled"] as const },
] as const;

export function unresolvedFollowUpCount(actions: IncidentsAddFollowUpActionResponse[]): number {
  return actions.filter((a) => a.status === "open" || a.status === "in_progress").length;
}
