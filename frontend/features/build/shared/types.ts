import type { StatusConfigEntry } from "@/lib/status-config";
import type { StatusFilterOption } from "@/components/list-view/filter-types";

import type { TicketPriority } from "@/types/projects";

export type GroupByOption = "status" | "assignee" | "priority" | "label" | "cycle" | "project" | "none";
export type ColumnByOption = "status" | "assignee" | "priority" | "label" | "cycle" | "project";
export type SwimlaneBy = "none" | "status" | "assignee" | "priority" | "cycle";
export type OrderByOption = "created" | "priority" | "dueDate" | "manual";
export type CompletedIssuesFilter = "all" | "none" | "last-day" | "last-week" | "last-month";

export interface DisplayOptions {
  columnBy: ColumnByOption;
  rowBy: SwimlaneBy;
  groupBy: GroupByOption;
  orderBy: OrderByOption;
  orderCompleteByRecency: boolean;
  completedIssues: CompletedIssuesFilter;
  showSubIssues: boolean;
  showEmptyGroups: boolean;
  showEmptyColumns: boolean;
  showEmptyRows: boolean;
  showId: boolean;
  showStatus: boolean;
  showAssignee: boolean;
  showPriority: boolean;
  showEstimate: boolean;
  showCycle: boolean;
  showLabels: boolean;
  showDescription: boolean;
  showDueDate: boolean;
  showProject: boolean;
  showMilestone: boolean;
  showLinks: boolean;
  showTimeInStatus: boolean;
  showCreated: boolean;
  showUpdated: boolean;
  showPRs: boolean;
}

export interface KanbanTicket {
  id: number;
  title: string;
  descriptionExcerpt?: string | null;
  type: string;
  status: string;
  priority?: TicketPriority | string | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  points?: number | null;
  storyPoints?: number | null;
  assigneeId?: string | null;
  epicId?: number | null;
  cycleId?: number | null;
  moduleId?: number | null;
  rank?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  timeSpent?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  assignees?: {
    user?: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }[];
  labels?: {
    label?: {
      id: number;
      name: string;
      color?: string | null;
    };
  }[];
  cycle?: {
    id: number;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  project?: { id: number; name: string; key: string } | null;
}

export interface KanbanColumn {
  id: string;
  statusId?: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number;
}

export const priorityConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  URGENT: { label: "Urgent", color: "text-status-danger-ink-strong", icon: "AlertTriangle" },
  HIGH: { label: "High", color: "text-status-warning-ink-strong", icon: "ArrowUp" },
  MEDIUM: { label: "Medium", color: "text-status-warning-ink-strong", icon: "Minus" },
  LOW: { label: "Low", color: "text-status-info-ink-strong", icon: "ArrowDown" },
};

export const statusConfig: Record<string, StatusConfigEntry> = {
  TODO: { label: "To Do", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", dotColor: "bg-status-info-fill" },
  IN_REVIEW: { label: "In Review", dotColor: "bg-status-warning-fill" },
  DONE: { label: "Done", dotColor: "bg-status-success-fill" },
};

export interface StatusOptionSource {
  name: string;
  color?: string | null;
  type?: string | null;
}

const LEGACY_STATUS_OPTIONS: StatusFilterOption[] = Object.keys(statusConfig).map(
  (name) => ({ name, color: null, type: null }),
);

export function resolveStatusOptions(
  statuses: readonly StatusOptionSource[] | undefined,
): StatusFilterOption[] {
  if (!statuses || statuses.length === 0) return LEGACY_STATUS_OPTIONS;
  return statuses.map((s) => ({
    name: s.name,
    color: s.color ?? null,
    type: s.type ?? null,
  }));
}

const TYPE_TO_DOT_COLOR: Record<string, string> = {
  unstarted: "bg-muted-foreground",
  started: "bg-status-info-fill",
  completed: "bg-status-success-fill",
  cancelled: "bg-status-danger-fill",
};

export function buildStatusConfig(
  projectStatuses: Array<{ name: string; color: string | null; type?: string | null }>,
): Record<string, StatusConfigEntry> {
  const merged: Record<string, StatusConfigEntry> = { ...statusConfig };
  for (const s of projectStatuses) {
    merged[s.name] = {
      label: s.name.replace(/_/g, " "),
      dotColor: TYPE_TO_DOT_COLOR[s.type ?? "unstarted"] ?? "bg-muted-foreground",
      color: s.color,
    };
  }
  return merged;
}

export const typeConfig: Record<
  string,
  { label: string; color: string }
> = {
  TASK: { label: "Task", color: "text-status-info-ink-strong" },
  BUG: { label: "Bug", color: "text-status-danger-ink-strong" },
  STORY: { label: "Story", color: "text-status-success-ink-strong" },
  EPIC: { label: "Epic", color: "text-status-info-ink-strong" },
  SUBTASK: { label: "Subtask", color: "text-muted-foreground" },
};
