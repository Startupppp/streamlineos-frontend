"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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

interface ReviewTableProps {
  list: EmployeeDocSummary[];
  canReview: boolean;
  onOpenReview: (emp: EmployeeDocSummary) => void;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
    case "SUBMITTED":
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700";
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
          className="text-[11px] text-muted-foreground tabular-nums font-semibold shrink-0"
          aria-label={label}
        >
          {approved}/{total}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
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

export function ReviewTable({ list, canReview, onOpenReview }: ReviewTableProps) {
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
            <p className="text-sm font-semibold text-foreground truncate">
              {emp.userName ?? "Unknown"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {emp.designation ?? "—"}
              {emp.employeeId ? ` · ${emp.employeeId}` : ""}
            </p>
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
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
    />
  );
}
