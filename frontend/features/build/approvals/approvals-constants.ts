import type { ApprovalStatus } from "@/types/projects";
import { DB_ENUMS } from "@/contracts/db-enums.generated";

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

type EntityMeta = {
  label: string;
  searchLabel: string;
  titlePrefix: string;
};

const ENTITY_META_MAP = new Map<string, EntityMeta>([
  ["task", { label: "Task", searchLabel: "tasks", titlePrefix: "Approve task" }],
  ["milestone", { label: "Milestone", searchLabel: "milestones", titlePrefix: "Approve milestone" }],
  ["budget", { label: "Budget", searchLabel: "", titlePrefix: "Approve budget" }],
  ["release", { label: "Release", searchLabel: "releases", titlePrefix: "Approve release" }],
  ["change_request", { label: "Change Request", searchLabel: "change requests", titlePrefix: "Approve change request" }],
  ["document", { label: "Document", searchLabel: "documents", titlePrefix: "Approve document" }],
  ["timesheet", { label: "Timesheet Entry", searchLabel: "timesheet entries", titlePrefix: "Approve timesheet" }],
  ["client_approval", { label: "Client Approval", searchLabel: "client approvals", titlePrefix: "Approve client request" }],
]);

function humanizeEntityType(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function entityTypeLabel(value: string): string {
  return ENTITY_META_MAP.get(value)?.label ?? humanizeEntityType(value);
}

export function entityTypeSearchLabel(value: string): string {
  return ENTITY_META_MAP.get(value)?.searchLabel ?? humanizeEntityType(value).toLowerCase();
}

export function entityTypeTitlePrefix(value: string): string {
  return ENTITY_META_MAP.get(value)?.titlePrefix ?? `Approve ${humanizeEntityType(value).toLowerCase()}`;
}

export const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  ...DB_ENUMS.approval_entity_type.map((v) => ({
    value: v,
    label: entityTypeLabel(v),
  })),
];

export const DECIDABLE = new Set<ApprovalStatus>(["pending", "requested", "escalated", "changes_requested"]);
