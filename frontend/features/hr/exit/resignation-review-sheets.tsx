"use client";

import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { RejectRemarksSheet } from "@/features/hr/exit/reject-remarks-sheet";
import type { ResignationReview } from "@/features/hr/exit/use-resignation-review";

interface ResignationReviewSheetsProps {
  review: ResignationReview;
}

/**
 * The confirmation surface for the approval chain in `useResignationReview`.
 * It renders nothing until a step is requested, so the list page mounts it once
 * and never branches on which sheet is open.
 */
export function ResignationReviewSheets({ review }: ResignationReviewSheetsProps) {
  return (
    <>
      <ConfirmSheet
        open={review.hrApproveId !== null}
        onOpenChange={review.setHrApproveOpen}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the FINAL for final approval."
        confirmLabel="Approve"
        onConfirm={review.confirmHrApprove}
        isPending={review.isHrPending}
      />

      <ConfirmSheet
        open={review.finalApproveId !== null}
        onOpenChange={review.setFinalApproveOpen}
        title="Approve Resignation (FINAL)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        onConfirm={review.confirmFinalApprove}
        isPending={review.isFinalPending}
      />

      <RejectRemarksSheet
        open={review.rejectRemarksOpen}
        rejectDialog={review.rejectDialog}
        onOpenChange={review.setRejectRemarksOpen}
      />

      <ConfirmSheet
        open={review.withdrawId !== null}
        onOpenChange={review.setWithdrawOpen}
        title="Withdraw Resignation"
        description="Are you sure you want to withdraw your resignation? This action cannot be undone."
        confirmLabel="Withdraw"
        destructive
        onConfirm={review.confirmWithdraw}
        isPending={review.isWithdrawPending}
      />
    </>
  );
}
