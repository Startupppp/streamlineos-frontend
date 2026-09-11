export type ProjectStatusValue = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export type CycleStatus = "draft" | "active" | "completed";

export type ModuleStatus =
  | "backlog"
  | "planned"
  | "in-progress"
  | "completed"
  | "paused"
  | "cancelled";

export type IntakeStatus = "pending" | "accepted" | "declined" | "duplicate";

export type IntakeSource = "manual" | "web_form" | "email";

export type ViewLayoutType = "board" | "list" | "table" | "calendar" | "gantt";

// `total` rides the first page only; later pages carry no count because the cursor already knows there is more.
export interface CursorPaginatedResponse<T> {
  data: T[];
  total?: number;
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPageResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}
