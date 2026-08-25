"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  BadgeDollarSign,
  Check,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { TruncatedText } from "@/components/ui/truncated-text";

import type { Termination, TerminationStatus, TerminationPagination } from "@/hooks/api/hr";
import { getInitials } from "@/lib/format-utils";
import {
  TERMINATION_STATUS_LABELS,
  TERMINATION_STATUSES,
} from "@/lib/constants/hr-separation";


function statusLabel(status: TerminationStatus | null): string {
  if (status && status in TERMINATION_STATUS_LABELS) {
    return TERMINATION_STATUS_LABELS[status as keyof typeof TERMINATION_STATUS_LABELS];
  }
  return status ?? "Unknown";
}

interface TerminationCardProps {
  record: Termination;
  canManageExit: boolean;
  canApproveExit: boolean;
  onView: (record: Termination) => void;
  onSubmit: (terminationId: number) => void;
  onApprove: (terminationId: number) => void;
  onReject: (terminationId: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (terminationId: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

function TerminationCard({
  record,
  canManageExit,
  canApproveExit,
  onView,
  onSubmit,
  onApprove,
  onReject,
  onSendEmail,
  onComplete,
  isSubmitting,
  isCompleting,
}: TerminationCardProps) {
  const { employee, status, reasons, effectiveDate, severanceAmount, noticePeriodWaived, emailStatus } =
    record;

  const reasonsList = reasons ?? [];
  const visibleReasons = reasonsList.slice(0, 2);
  const extraCount = reasonsList.length - 2;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 border-l-rose-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="text-xs font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300">
              {getInitials(employee?.name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <TruncatedText text={employee?.name ?? "Employee"} className="text-sm font-semibold" />
              <StatusBadge status={status} label={statusLabel(status)} className="text-micro shrink-0" />
              {emailStatus === "failed" && (
                <Badge
                  variant="outline"
                  className="text-micro font-semibold shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800"
                >
                  Email Failed
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-dense text-muted-foreground mt-0.5 flex-wrap">
              {employee?.designation && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {employee.designation}
                </span>
              )}
              {employee?.employeeId && <span>ID: {employee.employeeId}</span>}
              {effectiveDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Effective: {format(new Date(effectiveDate), "MMM d, yyyy")}
                </span>
              )}
              {severanceAmount && Number(severanceAmount) > 0 && (
                <span className="flex items-center gap-1">
                  <BadgeDollarSign className="h-3 w-3" />
                  ₹{Number(severanceAmount).toLocaleString("en-IN")}
                </span>
              )}
              {noticePeriodWaived && (
                <span className="text-amber-600 dark:text-amber-300 font-medium">Notice waived</span>
              )}
            </div>

            {status === "REJECTED" && record.finalRemarks && (
              <p className="text-dense text-rose-600 dark:text-rose-300 mt-1 line-clamp-2">
                FINAL: {record.finalRemarks}
              </p>
            )}

            {reasonsList.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {visibleReasons.map((terminationReason) => (
                  <Badge key={terminationReason} variant="outline" className="text-[9px] py-0 h-4 font-semibold">
                    {terminationReason}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline" className="text-[9px] py-0 h-4 font-semibold">
                    +{extraCount} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1.5 duration-200"
              onClick={() => onView(record)}
              aria-label={`View termination details for ${employee?.name ?? "employee"}`}
            >
              <Eye className="h-3 w-3" />
              View
            </Button>

            {canManageExit && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for FINAL approval`}
              >
                <AlertTriangle className="h-3 w-3" />
                Submit for Approval
              </Button>
            )}

            {canManageExit && status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for FINAL approval`}
              >
                <AlertTriangle className="h-3 w-3" />
                Resubmit
              </Button>
            )}

            {canApproveExit && status === "PENDING_FINAL" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 duration-200"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 duration-200 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
              </>
            )}

            {canManageExit && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail className="h-3 w-3" />
                Send Email
              </Button>
            )}

            {canManageExit && status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check className="h-3 w-3" />
                Complete
              </Button>
            )}

            {status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800">
                Completed
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type StatusFilter = "ALL" | TerminationStatus;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...TERMINATION_STATUSES.map((terminationStatus) => ({
    value: terminationStatus as StatusFilter,
    label: TERMINATION_STATUS_LABELS[terminationStatus],
  })),
];

interface TerminationListProps {
  terminations: Termination[];
  statusCounts?: Record<string, number>;
  pagination?: TerminationPagination;
  onPageChange: (page: number) => void;
  canManageExit: boolean;
  canApproveExit: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onView: (record: Termination) => void;
  onSubmit: (terminationId: number) => void;
  onApprove: (terminationId: number) => void;
  onReject: (terminationId: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (terminationId: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

export function TerminationList({
  terminations,
  statusCounts,
  pagination,
  onPageChange,
  canManageExit,
  canApproveExit,
  statusFilter,
  onStatusFilterChange,
  onView,
  onSubmit,
  onApprove,
  onReject,
  onSendEmail,
  onComplete,
  isSubmitting,
  isCompleting,
}: TerminationListProps) {
  const counts = statusCounts ?? {};

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            className="text-xs gap-1.5 duration-200"
            onClick={() => onStatusFilterChange(value)}
          >
            {label}
            {(counts[value] ?? 0) > 0 && (
              <Badge
                variant={statusFilter === value ? "secondary" : "outline"}
                className="ml-1 text-[9px] px-1.5 py-0 h-4 font-semibold"
              >
                {counts[value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {terminations.length === 0 ? (
        <EmptyState
          illustrationPreset="person"
          title={
            statusFilter === "ALL"
              ? "No termination records found"
              : `No ${TERMINATION_STATUS_LABELS[statusFilter as keyof typeof TERMINATION_STATUS_LABELS] ?? statusFilter} records`
          }
          compact
        />
      ) : (
        <div className="space-y-2">
          {terminations.map((record: Termination) => (
            <TerminationCard
              key={record.id}
              record={record}
              canManageExit={canManageExit}
              canApproveExit={canApproveExit}
              onView={onView}
              onSubmit={onSubmit}
              onApprove={onApprove}
              onReject={onReject}
              onSendEmail={onSendEmail}
              onComplete={onComplete}
              isSubmitting={isSubmitting}
              isCompleting={isCompleting}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={onPageChange}
          className="mt-4 rounded-xl"
        />
      )}
    </>
  );
}
