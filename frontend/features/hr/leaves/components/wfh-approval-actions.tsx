"use client";

import { useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

interface WfhApprovalActionsProps {
  requestId: number;
  isPending: boolean;
  onApprove: (id: number) => void;
  onRejectOpen: (id: number) => void;
}

export function WfhApprovalActions({
  requestId,
  isPending,
  onApprove,
  onRejectOpen,
}: WfhApprovalActionsProps) {
  const handleApprove = useCallback(
    () => onApprove(requestId),
    [requestId, onApprove],
  );
  const handleReject = useCallback(
    () => onRejectOpen(requestId),
    [requestId, onRejectOpen],
  );

  return (
    <div className="flex gap-2">
      <LoadingButton
        size="sm"
        className="h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-dense font-semibold px-3 gap-1 border-0 transition-colors duration-200"
        onClick={handleApprove}
        isPending={isPending}
      >
        <CheckCircle2 className="h-3 w-3" />
        Approve
      </LoadingButton>
      <Button
        size="sm"
        className="h-7 rounded-full bg-transparent border border-destructive/30 text-destructive hover:bg-destructive/10 text-dense font-semibold px-3 gap-1 transition-colors duration-200"
        onClick={handleReject}
        disabled={isPending}
      >
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}
