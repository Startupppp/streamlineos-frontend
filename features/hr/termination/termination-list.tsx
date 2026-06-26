"use client";

import { useMemo } from "react";
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

import type { Termination, TerminationStatus } from "@/lib/api/hooks/hr";
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface TerminationCardProps {
  record: Termination;
  isHR: boolean;
  isCEO: boolean;
  onView: (record: Termination) => void;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (id: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

function TerminationCard({
  record,
  isHR,
  isCEO,
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
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-rose-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="text-xs font-semibold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
              {getInitials(employee?.name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{employee?.name ?? "Employee"}</p>
              <StatusBadge status={status} label={statusLabel(status)} className="text-[10px] shrink-0" />
              {emailStatus === "failed" && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                >
                  Email Failed
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
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
                <span className="text-amber-600 dark:text-amber-400 font-medium">Notice waived</span>
              )}
            </div>

            {status === "REJECTED" && record.ceoRemarks && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 line-clamp-2">
                CEO: {record.ceoRemarks}
              </p>
            )}

            {reasonsList.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {visibleReasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-[9px] py-0 h-4 font-semibold">
                    {r}
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
              className="h-7 text-xs gap-1.5 duration-200"
              onClick={() => onView(record)}
              aria-label={`View termination details for ${employee?.name ?? "employee"}`}
            >
              <Eye className="h-3 w-3" />
              View
            </Button>

            {isHR && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 duration-200"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3" />
                Submit for Approval
              </Button>
            )}

            {isHR && status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 duration-200"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3" />
                Resubmit
              </Button>
            )}

            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 duration-200"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 duration-200 text-rose-600 hover:text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
              </>
            )}

            {isHR && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 duration-200"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail className="h-3 w-3" />
                Send Email
              </Button>
            )}

            {isHR && status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 duration-200"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check className="h-3 w-3" />
                Complete
              </Button>
            )}

            {status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
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
  ...TERMINATION_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: TERMINATION_STATUS_LABELS[s],
  })),
];

interface TerminationListProps {
  terminations: Termination[];
  isHR: boolean;
  isCEO: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onView: (record: Termination) => void;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (id: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

export function TerminationList({
  terminations,
  isHR,
  isCEO,
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
  const list = useMemo(() => {
    if (statusFilter === "ALL") return terminations;
    return terminations.filter((t) => t.status === statusFilter);
  }, [terminations, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: terminations.length };
    for (const s of TERMINATION_STATUSES) counts[s] = 0;
    for (const t of terminations) {
      if (t.status) counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [terminations]);

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            className="h-7 text-xs gap-1.5 duration-200"
            onClick={() => onStatusFilterChange(value)}
          >
            {label}
            {statusCounts[value] > 0 && (
              <Badge
                variant={statusFilter === value ? "secondary" : "outline"}
                className="ml-1 text-[9px] px-1.5 py-0 h-4 font-semibold"
              >
                {statusCounts[value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          illustration={<User className="h-8 w-8 text-muted-foreground" />}
          title={
            statusFilter === "ALL"
              ? "No termination records found"
              : `No ${TERMINATION_STATUS_LABELS[statusFilter as keyof typeof TERMINATION_STATUS_LABELS] ?? statusFilter} records`
          }
          compact
        />
      ) : (
        <div className="space-y-2">
          {list.map((record: Termination) => (
            <TerminationCard
              key={record.id}
              record={record}
              isHR={isHR}
              isCEO={isCEO}
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
    </>
  );
}
