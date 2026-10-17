"use client";

import React, { useCallback, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { useApproveLeaveDedicated, useRejectLeaveDedicated } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { LEAVE_REJECTION_LAYOUT } from "@/lib/renderer/hr/leave-rejection-layout";

import { LeaveStatusBadge } from "./leave-status-badge";
import {
  NeedsAnotherApprover,
  SelfApprovalBadge,
  SelfApprovalConfirmDialog,
  useIsSoleSelfApprover,
} from "@/features/hr/shared/self-approval";
import type { LeaveRequest } from "./leaves-shared";

/**
 * V-044. The approve/reject controls and their two dialogs used to live inside
 * `leave-approvals-list.tsx`, so `/hr/approvals` — the page that is supposed to
 * be the single HR approvals queue — rendered its leave rows as plain links
 * with nothing to act on. They are lifted here whole, mutations included, so
 * both surfaces drive the same two mutations through the same dialogs.
 */
export type LeaveDecision = "APPROVED" | "REJECTED";

export interface LeaveDecisionControls {
  onProcess: (requestId: number, decision: LeaveDecision, selfApproval?: boolean) => void;
  processingId: number | null;
  isPending: boolean;
  decisionDialogs: React.ReactNode;
}

export function useLeaveDecisions(): LeaveDecisionControls {
  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvingSelf, setApprovingSelf] = useState(false);

  const rejectionLayout = useTenantLayout(LEAVE_REJECTION_LAYOUT);

  const rawProcessingId =
    approveMutation.variables?.leaveId ?? rejectMutation.variables?.leaveId ?? null;
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const onProcess = useCallback((requestId: number, decision: LeaveDecision, selfApproval = false) => {
    if (decision === "APPROVED") {
      setApprovingId(requestId);
      setApprovalComment("");
      setApprovingSelf(selfApproval);
      setApproveDialogOpen(true);
    } else {
      setRejectingId(requestId);
      setRejectDialogOpen(true);
    }
  }, []);

  const handleApproveConfirm = useCallback(() => {
    if (approvingId === null) return;
    const comment = approvalComment.trim();
    approveMutation.mutate(
      {
        leaveId: approvingId,
        ...(comment ? { comment } : {}),
        ...(approvingSelf ? { confirmSelfApproval: true } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Leave request approved");
          setApproveDialogOpen(false);
          setApprovingId(null);
          setApprovalComment("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [approvingId, approvalComment, approvingSelf, approveMutation]);

  const handleApprovalCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setApprovalComment(e.target.value);
    },
    [],
  );

  const handleApproveOpenChange = useCallback((open: boolean) => {
    setApproveDialogOpen(open);
    if (!open) {
      setApprovingId(null);
      setApprovalComment("");
    }
  }, []);

  const handleRejectConfirm = useCallback((values: RecordFormValues) => {
    if (rejectingId === null) return;
    rejectMutation.mutate(
      { leaveId: rejectingId, reason: values.reason ?? "" },
      {
        onSuccess: () => {
          toast.success("Leave request rejected");
          setRejectDialogOpen(false);
          setRejectingId(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rejectingId, rejectMutation]);

  const { isPending: isRejecting } = rejectMutation;
  const handleRejectOpenChange = useCallback((open: boolean) => {
    // Held open while the rejection is in flight, as the confirm dialog did.
    if (!open && isRejecting) return;
    setRejectDialogOpen(open);
    if (!open) setRejectingId(null);
  }, [isRejecting]);

  const handleRejectCancel = useCallback(() => handleRejectOpenChange(false), [handleRejectOpenChange]);

  const decisionDialogs = (
    <>
      <SelfApprovalConfirmDialog
        open={approveDialogOpen && approvingSelf}
        onOpenChange={handleApproveOpenChange}
        subject="leave request"
        isPending={approveMutation.isPending}
        onConfirm={handleApproveConfirm}
      />
      <ConfirmDialog
        open={approveDialogOpen && !approvingSelf}
        onOpenChange={handleApproveOpenChange}
        title="Approve Leave Request"
        description="Add a note for the requester if you want to. It is not required."
        confirmLabel="Approve"
        isPending={approveMutation.isPending}
        keepOpenOnConfirm
        onConfirm={handleApproveConfirm}
        content={
          <div className="space-y-1.5">
            <Label
              htmlFor="leave-approval-comment"
              className="text-xs font-medium text-foreground"
            >
              Comment{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="leave-approval-comment"
              placeholder="E.g. Approved — enjoy the break."
              value={approvalComment}
              onChange={handleApprovalCommentChange}
              rows={3}
              maxLength={2000}
              className="resize-none text-sm"
            />
          </div>
        }
      />
      <Dialog open={rejectDialogOpen} onOpenChange={handleRejectOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <RecordForm
            key={rejectingId ?? "closed"}
            layout={rejectionLayout}
            mode="create"
            onSubmit={handleRejectConfirm}
            onCancel={handleRejectCancel}
            isSubmitting={rejectMutation.isPending}
            submitLabel="Reject"
          />
        </DialogContent>
      </Dialog>
    </>
  );

  return {
    onProcess,
    processingId: isPending ? rawProcessingId : null,
    isPending,
    decisionDialogs,
  };
}

interface LeaveDecisionButtonsProps {
  request: Pick<LeaveRequest, "id" | "status" | "user">;
  currentUserId: string | undefined;
  processingId: number | null;
  onProcess: LeaveDecisionControls["onProcess"];
}

export function LeaveDecisionButtons({
  request,
  currentUserId,
  processingId,
  onProcess,
}: LeaveDecisionButtonsProps) {
  const status = request.status ?? "PENDING";
  const isSelfRequest = !!currentUserId && request.user?.id === currentUserId;
  /**
   * BUG-HRMS-017. A sole owner decides their own leave, because the router already
   * routed it to them: no rung and no queue member remains, and refusing here left
   * the request PENDING for ever with balances frozen and nothing on screen but
   * "Cannot approve own request" and no alternate approver to reach for.
   *
   * Read from the same route `PUT /hr/leaves/:id/approve` consults, so this control
   * and the endpoint answer the same question from the same source rather than each
   * deciding for itself — which is how they came to disagree. Only fetched for a
   * self-request; every other row is refused on the requester's identity alone.
   */
  const mayDecideOwn = useIsSoleSelfApprover("leave", currentUserId, isSelfRequest) && isSelfRequest;
  // PUT /hr/leaves/:id/approve|reject require hr:leaves:approve (FE-44). The
  // approvals surfaces are also open to WFH-only deciders, who must not see
  // controls that can only fail for them.
  const canDecide = useCan("hr:leaves:approve");

  const handleApprove = useCallback(
    () => onProcess(request.id, "APPROVED", isSelfRequest),
    [request.id, onProcess, isSelfRequest],
  );
  const handleReject = useCallback(
    () => onProcess(request.id, "REJECTED"),
    [request.id, onProcess],
  );

  if (status !== "PENDING" || !canDecide) return <LeaveStatusBadge status={status} />;

  if (isSelfRequest && !mayDecideOwn) return <NeedsAnotherApprover />;

  return (
    <>
      {isSelfRequest ? <SelfApprovalBadge /> : null}
      <LoadingButton
        size="sm"
        className="min-h-11 rounded-full md:h-7 md:min-h-0 bg-status-success-fill hover:bg-status-success-fill-hover text-white text-dense font-semibold px-3 gap-1 border-0 transition-colors duration-200"
        isPending={processingId === request.id}
        onClick={handleApprove}
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Approve
      </LoadingButton>
      <Button
        size="sm"
        className="min-h-11 rounded-full md:h-7 md:min-h-0 bg-transparent border border-destructive/30 text-destructive hover:bg-destructive/10 text-dense font-semibold px-3 gap-1 transition-colors duration-200"
        disabled={processingId === request.id}
        onClick={handleReject}
      >
        <XCircle className="h-3 w-3" aria-hidden="true" />
        Reject
      </Button>
    </>
  );
}
