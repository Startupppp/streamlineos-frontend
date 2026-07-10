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
  type: string;
  status: string;
  priority?: TicketPriority | string | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  points?: number | null;
  storyPoints?: number | null;
  assigneeId?: string | null;
  epicId?: number | null;
  sprintId?: number | null;
  cycleId?: number | null;
  order?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  timeSpent?: string | null;
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
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number;
}

export const priorityConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  URGENT: { label: "Urgent", color: "text-red-500", icon: "AlertTriangle" },
  HIGH: { label: "High", color: "text-orange-500", icon: "ArrowUp" },
  MEDIUM: { label: "Medium", color: "text-yellow-500", icon: "Minus" },
  LOW: { label: "Low", color: "text-blue-500", icon: "ArrowDown" },
};

export interface StatusConfigEntry {
  label: string;
  dotColor: string;
  color?: string | null;
}

export const statusConfig: Record<string, StatusConfigEntry> = {
  TODO: { label: "To Do", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", dotColor: "bg-blue-500" },
  IN_REVIEW: { label: "In Review", dotColor: "bg-amber-500" },
  DONE: { label: "Done", dotColor: "bg-green-500" },
};

const TYPE_TO_DOT_COLOR: Record<string, string> = {
  unstarted: "bg-muted-foreground",
  started: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
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

export function getStatusEntry(
  config: Record<string, StatusConfigEntry>,
  key: string,
): StatusConfigEntry {
  return config[key] ?? { label: key.replace(/_/g, " "), dotColor: "bg-muted-foreground" };
}

export const typeConfig: Record<
  string,
  { label: string; color: string }
> = {
  TASK: { label: "Task", color: "text-blue-500" },
  BUG: { label: "Bug", color: "text-red-500" },
  STORY: { label: "Story", color: "text-green-500" },
  EPIC: { label: "Epic", color: "text-violet-600" },
  SUBTASK: { label: "Subtask", color: "text-muted-foreground" },
};
