"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  BadgeDollarSign,
  AlertTriangle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

import type { Termination } from "@/hooks/api/hr";

function terminationStatusBadgeClass(status: string | null): string {
  if (status === "APPROVED" || status === "COMPLETED")
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (status === "PENDING_CEO")
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  if (status === "REJECTED")
    return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  if (status === "SENT")
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
  return "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700";
}

function terminationStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_CEO: "Pending CEO",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SENT: "Email Sent",
    COMPLETED: "Completed",
  };
  return status ? (labels[status] ?? status) : "—";
}

interface TerminationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewRecord: Termination | null;
  reviewDecision?: "approve" | "reject" | null;
  ceoRemarks?: string;
  onCeoRemarksChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPending?: boolean;
  onSubmit?: () => void;
  isViewOnly?: boolean;
}

export function TerminationDetailSheet({
  open,
  onOpenChange,
  reviewRecord,
  reviewDecision = null,
  ceoRemarks = "",
  onCeoRemarksChange,
  isPending = false,
  onSubmit,
  isViewOnly = false,
}: TerminationDetailSheetProps) {
  const title = isViewOnly
    ? "Termination Details"
    : reviewDecision === "approve"
      ? "Approve Termination"
      : "Reject Termination";

  const description = isViewOnly
    ? "Read-only view of termination record."
    : "Review the termination details before making a decision.";

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={isViewOnly ? undefined : onSubmit}
      showSubmit={!isViewOnly}
      submitLabel={
        reviewDecision === "approve" ? (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-destructive-foreground">
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </span>
        )
      }
      isPending={isPending}
    >
      {reviewRecord && (
        <>
          <div
            className={cn(
              "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 p-4 flex items-center gap-3",
              reviewRecord.status === "APPROVED" ||
                reviewRecord.status === "COMPLETED"
                ? "border-l-emerald-500"
                : reviewRecord.status === "REJECTED"
                  ? "border-l-rose-500"
                  : reviewRecord.status === "PENDING_CEO"
                    ? "border-l-amber-400"
                    : "border-l-slate-300 dark:border-l-slate-600",
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-xs font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                {getInitials(reviewRecord.employee?.name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold truncate">
                  {reviewRecord.employee?.name ?? "Employee"}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    terminationStatusBadgeClass(reviewRecord.status),
                  )}
                >
                  {terminationStatusLabel(reviewRecord.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reviewRecord.employee?.designation ?? "—"}
                {reviewRecord.employee?.employeeId
                  ? ` · ID: ${reviewRecord.employee.employeeId}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Effective Date
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {reviewRecord.effectiveDate
                  ? format(new Date(reviewRecord.effectiveDate), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>

            {reviewRecord.employee?.employeeId && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Employee ID
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {reviewRecord.employee.employeeId}
                </p>
              </div>
            )}

            {reviewRecord.severanceAmount &&
              Number(reviewRecord.severanceAmount) > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <BadgeDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Severance
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    ₹
                    {Number(reviewRecord.severanceAmount).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
              )}

            {reviewRecord.noticePeriodWaived && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Notice Period
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Waived
                </p>
              </div>
            )}
          </div>

          {(reviewRecord.reasons ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Reasons
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(reviewRecord.reasons ?? []).map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {reviewRecord.detailedExplanation && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Detailed Explanation
              </p>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {reviewRecord.detailedExplanation}
                </p>
              </div>
            </div>
          )}

          {!isViewOnly && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  CEO Remarks{" "}
                  {reviewDecision === "reject" ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  )}
                </Label>
                <Textarea
                  placeholder={
                    reviewDecision === "reject"
                      ? "Remarks are required when rejecting..."
                      : "Add any remarks or comments..."
                  }
                  value={ceoRemarks}
                  onChange={onCeoRemarksChange}
                  rows={3}
                  aria-label="CEO remarks"
                  className="resize-none"
                />
              </div>
            </>
          )}

          {isViewOnly && reviewRecord.ceoRemarks && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  CEO Remarks
                </p>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {reviewRecord.ceoRemarks}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </HrSheet>
  );
}
