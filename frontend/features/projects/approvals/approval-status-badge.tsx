import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus } from "@/types/projects";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; className: string }
> = {
  requested: {
    label: "Requested",
    className: "border-amber-300 bg-amber-50 text-amber-700",
  },
  pending: {
    label: "Pending",
    className: "border-amber-300 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-300 bg-red-50 text-red-700",
  },
  changes_requested: {
    label: "Changes Requested",
    className: "border-blue-300 bg-blue-50 text-blue-700",
  },
  escalated: {
    label: "Escalated",
    className: "border-amber-400 bg-amber-100 text-amber-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-slate-300 bg-slate-50 text-slate-500",
  },
};

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

export function ApprovalStatusBadge({
  status,
  className,
}: ApprovalStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}

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
