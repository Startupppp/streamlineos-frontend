"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { HrSheet } from "@/features/hr/hr-sheet";

import { useCeoReviewTermination, type Termination } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "./termination-utils";

interface CeoReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewRecord: Termination | null;
  reviewDecision: "approve" | "reject" | null;
  ceoRemarks: string;
  setCeoRemarks: (value: string) => void;
  onClose: () => void;
}

export function CeoReviewSheet({
  open,
  onOpenChange,
  reviewRecord,
  reviewDecision,
  ceoRemarks,
  setCeoRemarks,
  onClose,
}: CeoReviewSheetProps) {
  const ceoReview = useCeoReviewTermination();

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) onClose();
    },
    [onOpenChange, onClose]
  );

  const handleRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setCeoRemarks(e.target.value),
    [setCeoRemarks]
  );

  const handleCeoReviewSubmit = useCallback(() => {
    if (!reviewRecord || !reviewDecision) return;
    ceoReview.mutate(
      {
        id: reviewRecord.id,
        decision: reviewDecision,
        remarks: ceoRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            reviewDecision === "approve"
              ? "Termination approved"
              : "Termination rejected"
          );
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reviewRecord, reviewDecision, ceoRemarks, ceoReview, onClose]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title={
        reviewDecision === "approve" ? "Approve Termination" : "Reject Termination"
      }
      description="Review the termination details before making a decision."
      onSubmit={handleCeoReviewSubmit}
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
      isPending={ceoReview.isPending}
    >
      {reviewRecord && (
        <>
          {/* Employee info */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(reviewRecord.employee?.name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {reviewRecord.employee?.name ?? "Employee"}
              </p>
              <p className="text-xs text-muted-foreground">
                {reviewRecord.employee?.designation ?? "—"}
                {reviewRecord.employee?.employeeId
                  ? ` · ID: ${reviewRecord.employee.employeeId}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Effective date */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Effective Date
            </Label>
            <p className="text-sm">
              {reviewRecord.effectiveDate
                ? format(new Date(reviewRecord.effectiveDate), "MMMM d, yyyy")
                : "—"}
            </p>
          </div>

          {/* Reasons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reasons
            </Label>
            <div className="flex flex-wrap gap-1">
              {(reviewRecord.reasons ?? []).map((r) => (
                <Badge key={r} variant="outline" className="text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detailed Explanation
            </Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {reviewRecord.detailedExplanation}
            </p>
          </div>

          {/* Severance / notice */}
          {(reviewRecord.severanceAmount || reviewRecord.noticePeriodWaived) && (
            <div className="flex items-center gap-4 text-sm">
              {reviewRecord.severanceAmount &&
                Number(reviewRecord.severanceAmount) > 0 && (
                  <span>
                    Severance:{" "}
                    <strong>
                      ₹
                      {Number(reviewRecord.severanceAmount).toLocaleString("en-IN")}
                    </strong>
                  </span>
                )}
              {reviewRecord.noticePeriodWaived && (
                <span className="text-amber-600 dark:text-amber-400">
                  Notice period waived
                </span>
              )}
            </div>
          )}

          <Separator />

          {/* CEO Remarks */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              CEO Remarks{" "}
              {reviewDecision === "reject" ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">(optional)</span>
              )}
            </Label>
            <Textarea
              placeholder={
                reviewDecision === "reject"
                  ? "Remarks are required when rejecting..."
                  : "Add any remarks or comments..."
              }
              value={ceoRemarks}
              onChange={handleRemarksChange}
              rows={3}
              aria-label="CEO remarks"
            />
          </div>
        </>
      )}
    </HrSheet>
  );
}
