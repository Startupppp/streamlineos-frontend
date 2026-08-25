"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface EmployeeDocSummary {
  userId: string;
  userName: string | null;
  userImage: string | null;
  designation: string | null;
  employeeId: string | null;
  totalRequired: number;
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  onboardingDocStatus: string | null;
}

interface ReviewTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface ReviewTableProps {
  list: EmployeeDocSummary[];
  canReview: boolean;
  onOpenReview: (emp: EmployeeDocSummary) => void;
  pagination?: ReviewTablePagination;
}

function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "APPROVED":
      return "bg-status-success-surface text-status-success-ink border-status-success-rule";
    case "SUBMITTED":
    case "IN_PROGRESS":
      return "bg-status-info-surface text-status-info-ink border-status-info-rule";
    case "PENDING":
      return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "SUBMITTED":
      return "Submitted";
    case "IN_PROGRESS":
      return "In Progress";
    case "PENDING":
      return "Pending";
    default:
      return status ?? "Pending";
  }
}

function ProgressBar({ approved, total }: { approved: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
  const label =
    total === 0
      ? "No required documents configured"
      : `${approved} of ${total} required document${total === 1 ? "" : "s"} approved`;

  const barColor =
    pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="text-dense text-muted-foreground tabular-nums font-semibold shrink-0"
          aria-label={label}
        >
          {approved}/{total}
        </span>
      </div>
      <span className="text-micro text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function ReviewActionButton({ label, emp, onOpenReview }: { label: string; emp: EmployeeDocSummary; onOpenReview: (emp: EmployeeDocSummary) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  function handleClick() { onOpenReview(emp); }
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={handleClick}
      aria-label={`${label} documents for ${emp.userName}`}
      {...hoverHandlers}
    >
      <EyeIcon ref={iconRef} size={14} />
      {label}
    </Button>
  );
}

export function ReviewTable({ list, canReview, onOpenReview, pagination }: ReviewTableProps) {
  const columns = useMemo<DataTableColumn<EmployeeDocSummary>[]>(() => [
    {
      key: "employee",
      header: "Employee",
      cell: (emp) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 shrink-0">
            {emp.userImage && (
              <AvatarImage src={emp.userImage} alt={emp.userName ?? "Employee"} />
            )}
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {getInitials(emp.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <TruncatedText text={emp.userName ?? "Unknown"} className="text-sm font-semibold text-foreground" />
            <TruncatedText text={`${emp.designation ?? "—"}${emp.employeeId ? ` · ${emp.employeeId}` : ""}`} className="text-dense text-muted-foreground" />
          </div>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      cell: (emp) => (
        <ProgressBar approved={emp.totalApproved} total={emp.totalRequired} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (emp) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
            getStatusBadgeClass(emp.onboardingDocStatus),
          )}
        >
          {getStatusLabel(emp.onboardingDocStatus)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (emp) => (
        <ReviewActionButton label={canReview ? "Review" : "View"} emp={emp} onOpenReview={onOpenReview} />
      ),
    },
  ], [canReview, onOpenReview]);

  const emptyState = (
    <EmptyState
      illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
      title="No documents to review"
      description="Once employees submit onboarding documents, they will appear here."
    />
  );

  return (
    <DataTable
      data={list}
      columns={columns}
      getRowKey={(emp) => emp.userId}
      emptyState={emptyState}
      minWidth="640px"
      className="flex-1 min-h-0"
      pagination={pagination ? { mode: "server", ...pagination } : undefined}
    />
  );
}
