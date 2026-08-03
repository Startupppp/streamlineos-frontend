import type { ApprovalStatus } from "@/types/projects";

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "escalated", label: "Escalated" },
  { value: "cancelled", label: "Cancelled" },
];

export const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "task", label: "Task" },
  { value: "milestone", label: "Milestone" },
  { value: "budget", label: "Budget" },
  { value: "release", label: "Release" },
  { value: "change_request", label: "Change Request" },
  { value: "document", label: "Document" },
  { value: "timesheet", label: "Timesheet" },
  { value: "client_approval", label: "Client Approval" },
];

export const DECIDABLE = new Set<ApprovalStatus>(["pending", "requested", "escalated", "changes_requested"]);
