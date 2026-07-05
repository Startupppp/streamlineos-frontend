export type ProjectStatusValue = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketType = "TASK" | "BUG" | "STORY" | "EPIC" | "SUBTASK";

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

export type TimesheetStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
