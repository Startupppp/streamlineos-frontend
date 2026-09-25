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
import { HrSheet } from "@/components/shared/hr-sheet";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

import type { Termination } from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";

function terminationStatusBadgeClass(status: string | null): string {
  if (status === "APPROVED" || status === "COMPLETED")
    return "bg-status-success-surface text-status-success-ink border-status-success-rule";
  if (status === "PENDING_FINAL")
    return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  if (status === "REJECTED")
    return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
  if (status === "SENT")
    return "bg-status-info-surface text-status-info-ink border-status-info-rule";
  return "bg-muted text-muted-foreground border-border";
}

function terminationStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_FINAL: "Pending FINAL",
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
  finalRemarks?: string;
  onFinalRemarksChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPending?: boolean;
  onSubmit?: () => void;
  isViewOnly?: boolean;
}

export function TerminationDetailSheet({
  open,
  onOpenChange,
  reviewRecord,
  reviewDecision = null,
  finalRemarks = "",
  onFinalRemarksChange,
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
              "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden border-l-4 p-4 flex items-center gap-3",
              reviewRecord.status === "APPROVED" ||
                reviewRecord.status === "COMPLETED"
                ? "border-l-status-success-rule"
                : reviewRecord.status === "REJECTED"
                  ? "border-l-status-danger-rule"
                  : reviewRecord.status === "PENDING_FINAL"
                    ? "border-l-status-warning-rule"
                    : "border-l-border",
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-xs font-bold bg-status-danger-surface text-status-danger-ink">
                {getInitials(reviewRecord.employee?.name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <TruncatedText text={reviewRecord.employee?.name ?? "Employee"} className="text-sm font-semibold" />
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
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
                <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
                    <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
              <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" />
                  <p className="text-dense font-semibold text-status-warning-ink uppercase tracking-wider">
                    Notice Period
                  </p>
                </div>
                <p className="text-sm font-semibold text-status-warning-ink">
                  Waived
                </p>
              </div>
            )}
          </div>

          {(reviewRecord.reasons ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
                Reasons
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(reviewRecord.reasons ?? []).map((terminationReason) => (
                  <span
                    key={terminationReason}
                    className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                  >
                    {terminationReason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {reviewRecord.detailedExplanation && (
            <div className="space-y-1.5">
              <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
                  FINAL Remarks{" "}
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
                  value={finalRemarks}
                  onChange={onFinalRemarksChange}
                  rows={3}
                  aria-label="FINAL remarks"
                  className="resize-none"
                />
              </div>
            </>
          )}

          {isViewOnly && reviewRecord.finalRemarks && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
                  FINAL Remarks
                </p>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {reviewRecord.finalRemarks}
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
