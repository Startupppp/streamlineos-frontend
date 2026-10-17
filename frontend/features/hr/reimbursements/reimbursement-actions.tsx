"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

export function ReimbursementActions({
  reimbursementId,
  reimbursementUserId,
  currentUserId,
  isAdmin,
  isPending,
  isRowPending,
  onApprove,
  onStartReject,
}: {
  reimbursementId: number;
  reimbursementUserId: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  isPending: boolean;
  isRowPending: boolean;
  onApprove: (id: number) => void;
  onStartReject: (id: number) => void;
}) {
  function handleApproveClick() { onApprove(reimbursementId); }
  function handleRejectClick() { onStartReject(reimbursementId); }

  if (!isAdmin) return null;
  if (reimbursementUserId === currentUserId) {
    return <span className="text-micro text-muted-foreground italic">Cannot approve own</span>;
  }
  return (
    <div className="flex gap-1 justify-end">
      <LoadingButton size="sm" className="gap-1 text-xs" onClick={handleApproveClick} disabled={isPending} isPending={isRowPending}>
        {!isRowPending && <CheckCircle2 className="h-3 w-3" />}
        Approve
      </LoadingButton>
      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleRejectClick} disabled={isPending}>
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}
