"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useHrReviewResignation,
  useCeoReviewResignation,
} from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";

interface RejectDialogState {
  id: number;
  type: "hr" | "ceo";
}

interface RejectRemarksSheetProps {
  open: boolean;
  rejectDialog: RejectDialogState | null;
  onOpenChange: (open: boolean) => void;
}

export function RejectRemarksSheet({
  open,
  rejectDialog,
  onOpenChange,
}: RejectRemarksSheetProps) {
  const hrReview = useHrReviewResignation();
  const ceoReview = useCeoReviewResignation();

  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectRemarksError, setRejectRemarksError] = useState<string | null>(null);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) {
        setRejectRemarks("");
        setRejectRemarksError(null);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleRejectRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectRemarks(e.target.value);
      setRejectRemarksError(null);
    },
    [],
  );

  const handleRejectRemarksBlur = useCallback(() => {
    setRejectRemarksError(
      rejectRemarks.trim() ? null : "Remarks are required to reject a resignation.",
    );
  }, [rejectRemarks]);

  const handleConfirm = useCallback(() => {
    if (!rejectDialog) return;
    const trimmedRemarks = rejectRemarks.trim();
    if (!trimmedRemarks) {
      setRejectRemarksError("Remarks are required to reject a resignation.");
      return;
    }
    const mutate = rejectDialog.type === "hr" ? hrReview.mutate : ceoReview.mutate;
    mutate(
      { id: rejectDialog.id, action: "reject", remarks: trimmedRemarks },
      {
        onSuccess: () => {
          toast.success("Resignation rejected");
          setRejectRemarks("");
          setRejectRemarksError(null);
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [rejectDialog, rejectRemarks, hrReview, ceoReview, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleClose}
      title="Reject Resignation"
      onSubmit={handleConfirm}
      submitLabel="Reject"
      isPending={hrReview.isPending || ceoReview.isPending}
    >
      <p className="text-sm text-muted-foreground">
        Provide a reason for rejection. The employee will be notified.
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          Remarks <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="Enter your rejection remarks..."
          value={rejectRemarks}
          onChange={handleRejectRemarksChange}
          onBlur={handleRejectRemarksBlur}
          rows={4}
          maxLength={1000}
          className="resize-none w-full"
          aria-invalid={rejectRemarksError !== null}
        />
        {rejectRemarksError && (
          <p className="text-xs text-destructive">{rejectRemarksError}</p>
        )}
      </div>
    </HrSheet>
  );
}

export type { RejectDialogState };
