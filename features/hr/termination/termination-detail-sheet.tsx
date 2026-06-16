"use client";

import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";

import type { Termination } from "@/lib/api/hooks/hr";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface TerminationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewRecord: Termination | null;
  reviewDecision: "approve" | "reject" | null;
  ceoRemarks: string;
  onCeoRemarksChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPending: boolean;
  onSubmit: () => void;
}

export function TerminationDetailSheet({
  open,
  onOpenChange,
  reviewRecord,
  reviewDecision,
  ceoRemarks,
  onCeoRemarksChange,
  isPending,
  onSubmit,
}: TerminationDetailSheetProps) {
  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        reviewDecision === "approve"
          ? "Approve Termination"
          : "Reject Termination"
      }
      description="Review the termination details before making a decision."
      onSubmit={onSubmit}
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

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detailed Explanation
            </Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {reviewRecord.detailedExplanation}
            </p>
          </div>

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
              onChange={onCeoRemarksChange}
              rows={3}
              aria-label="CEO remarks"
            />
          </div>
        </>
      )}
    </HrSheet>
  );
}
