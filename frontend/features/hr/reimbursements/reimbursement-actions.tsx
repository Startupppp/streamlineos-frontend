"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReimbursementActions({
  reimbursementId,
  reimbursementUserId,
  currentUserId,
  isAdmin,
  isPending,
  onApprove,
  onStartReject,
}: {
  reimbursementId: number;
  reimbursementUserId: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  isPending: boolean;
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
      <Button size="sm" className="gap-1 text-xs" onClick={handleApproveClick} disabled={isPending}>
        <CheckCircle2 className="h-3 w-3" />
        Approve
      </Button>
      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleRejectClick}>
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}
