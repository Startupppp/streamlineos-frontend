"use client";

import { useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApprovalActionsProps {
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  requireReason?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  rejectTitle?: string;
  rejectDescription?: string;
  disabled?: boolean;
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
}

export function ApprovalActions({
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  requireReason = true,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  rejectTitle = "Reject",
  rejectDescription,
  disabled = false,
  size = "sm",
  className,
}: ApprovalActionsProps) {
  const [rejectOpen, setRejectOpen] = useState(false);

  function handleApprove() {
    onApprove();
  }

  function handleOpenRejectSheet() {
    setRejectOpen(true);
  }

  function handleConfirmReject(reason: string) {
    onReject(reason);
    setRejectOpen(false);
  }

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <LoadingButton
          size={size}
          variant="outline"
          className="text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
          isPending={isApproving}
          loadingText="Approving…"
          disabled={disabled || isRejecting}
          onClick={handleApprove}
        >
          {approveLabel}
        </LoadingButton>
        <LoadingButton
          size={size}
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          isPending={isRejecting}
          loadingText="Rejecting…"
          disabled={disabled || isApproving}
          onClick={handleOpenRejectSheet}
        >
          {rejectLabel}
        </LoadingButton>
      </div>
      <ConfirmWithReasonSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={rejectTitle}
        description={rejectDescription}
        reasonPlaceholder="Enter a reason…"
        reasonRequired={requireReason}
        confirmLabel={rejectLabel}
        isPending={isRejecting}
        onConfirm={handleConfirmReject}
      />
    </>
  );
}
