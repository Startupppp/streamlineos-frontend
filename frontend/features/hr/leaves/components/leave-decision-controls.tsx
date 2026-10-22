"use client";

import React, { useCallback, useState } from "react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { useApproveLeaveDedicated, useRejectLeaveDedicated } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";

import { LeaveStatusBadge } from "./leave-status-badge";
import {
  awaitsMyDecision,
  NeedsAnotherApprover,
  SelfApprovalBadge,
  SelfApprovalConfirmDialog,
  useIsSoleSelfApprover,
} from "@/features/hr/shared/self-approval";
import type { LeaveRequest } from "./leaves-shared";

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

  const rejectForm = useForm<{ reason: string }>({
    resolver: zodResolver(z.object({ reason: z.string().min(1, "Rejection reason is required.") })),
    defaultValues: { reason: "" },
  });
  const { field: reasonField, fieldState: reasonFieldState } = useController({
    name: "reason",
    control: rejectForm.control,
  });

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
      rejectForm.reset();
      setRejectDialogOpen(true);
    }
  }, [rejectForm]);

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

  const handleRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    void rejectForm.handleSubmit((values) => {
      rejectMutation.mutate(
        { leaveId: rejectingId, reason: values.reason },
        {
          onSuccess: () => {
            toast.success("Leave request rejected");
            setRejectDialogOpen(false);
            setRejectingId(null);
            rejectForm.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    })();
  }, [rejectingId, rejectMutation, rejectForm]);

  const handleRejectOpenChange = useCallback((open: boolean) => {
    setRejectDialogOpen(open);
    if (!open) {
      setRejectingId(null);
      rejectForm.reset();
    }
  }, [rejectForm]);

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
      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={handleRejectOpenChange}
        title="Reject Leave Request"
        description="Provide a reason for rejecting this request. The requester will be notified."
        confirmLabel="Reject"
        destructive
        isPending={rejectMutation.isPending}
        keepOpenOnConfirm
        onConfirm={handleRejectConfirm}
        content={
          <div className="space-y-1.5">
            <Label
              htmlFor="leave-rejection-reason"
              className="text-xs font-medium text-foreground"
            >
              Rejection Reason <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="leave-rejection-reason"
              placeholder="E.g. Insufficient notice, conflicting deadlines..."
              {...reasonField}
              rows={4}
              className="resize-none text-sm"
            />
            {reasonFieldState.error ? (
              <p id="leave-reject-reason-error" role="alert" className="text-sm text-destructive">{reasonFieldState.error.message}</p>
            ) : null}
          </div>
        }
      />
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
  const mayDecideOwn = useIsSoleSelfApprover("leave", currentUserId, isSelfRequest) && isSelfRequest;
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

  if (!awaitsMyDecision(request.user?.id, currentUserId, mayDecideOwn)) return <NeedsAnotherApprover />;

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
