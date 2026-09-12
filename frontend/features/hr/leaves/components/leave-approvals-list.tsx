"use client";

import React, { useState, useCallback } from "react";
import { useApproveLeaveDedicated, useRejectLeaveDedicated } from "@/hooks/api/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";

import type { LeaveRequest } from "./leaves-shared";
import { LeaveApprovalItem } from "./leave-approval-item";

interface LeaveApprovalsListProps {
  requests: LeaveRequest[];
  currentUserId: string | undefined;
}

export function LeaveApprovalsList({
  requests,
  currentUserId,
}: LeaveApprovalsListProps) {
  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const processingId =
    approveMutation.variables?.leaveId ?? rejectMutation.variables?.leaveId ?? null;
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const handleProcess = useCallback(
    (requestId: number, status: "APPROVED" | "REJECTED") => {
      if (status === "APPROVED") {
        approveMutation.mutate(
          { leaveId: requestId },
          {
            onSuccess: () => toast.success("Request approved successfully"),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        setRejectingId(requestId);
        setRejectionReason("");
        setRejectDialogOpen(true);
      }
    },
    [approveMutation],
  );

  const handleRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    rejectMutation.mutate(
      { leaveId: rejectingId, reason },
      {
        onSuccess: () => {
          toast.success("Request rejected successfully");
          setRejectDialogOpen(false);
          setRejectingId(null);
          setRejectionReason("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rejectingId, rejectionReason, rejectMutation]);

  const handleRejectionReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectionReason(e.target.value);
    },
    [],
  );

  const handleRejectCancel = useCallback(() => {
    setRejectDialogOpen(false);
    setRejectingId(null);
    setRejectionReason("");
  }, []);

  return (
    <>
      <ul className="space-y-3" aria-label="Leave approvals">
        {requests.map((req) => (
          <li key={req.id}>
            <LeaveApprovalItem
              req={req}
              processingId={isPending ? (processingId ?? null) : null}
              currentUserId={currentUserId}
              onProcess={handleProcess}
            />
          </li>
        ))}
      </ul>
      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent className="sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="p-5 pb-4 border-b">
            <SheetTitle className="text-base font-semibold">
              Reject Leave Request
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request.
            </p>
          </SheetHeader>
          <div className="flex-1 p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="E.g. Insufficient notice, conflicting deadlines..."
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                rows={4}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 p-5 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={handleRejectCancel}
            >
              Cancel
            </Button>
            <LoadingButton
              className="flex-1 h-9"
              isPending={rejectMutation.isPending}
              disabled={!rejectionReason.trim()}
              onClick={handleRejectConfirm}
            >
              Reject
            </LoadingButton>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
