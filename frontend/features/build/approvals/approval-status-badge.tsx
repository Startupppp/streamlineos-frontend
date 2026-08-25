import { memo } from "react";
import type { ApprovalStatus } from "@/types/projects";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const APPROVAL_STATUS_MAP: Record<ApprovalStatus, StatusEntry> = {
  requested: { label: "Requested", tone: "warning" },
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  changes_requested: { label: "Changes Requested", tone: "info" },
  escalated: {
    label: "Escalated",
    tone: "warning",
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
    className: "",
  },
};

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

export const ApprovalStatusBadge = memo(function ApprovalStatusBadge({
  status,
  className,
}: ApprovalStatusBadgeProps) {
  return <StatusMapBadge status={status} map={APPROVAL_STATUS_MAP} className={className} />;
});

export function entityTypeLabel(type: string): string {
  const MAP: Record<string, string> = {
    task: "Task",
    milestone: "Milestone",
    budget: "Budget",
    release: "Release",
    change_request: "Change Request",
    document: "Document",
    timesheet: "Timesheet",
    client_approval: "Client Approval",
  };
  return MAP[type] ?? type;
}
