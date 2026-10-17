"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";
import { useRunApprovals, useApproveStage, useRejectStage, useReopenRun } from "@/hooks/api/payroll";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ApprovalStage } from "@/hooks/api/payroll/approvals-schema";

interface Props {
  runId: number;
  status: string;
}

const VISIBLE_STATUSES = new Set([
  "PENDING_APPROVAL",
  "APPROVED",
  "LOCKED",
  "PAID",
  "PAYSLIPS_PUBLISHED",
  "CLOSED",
]);

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-status-warning-surface text-status-warning-ink",
  APPROVED: "bg-status-success-surface text-status-success-ink",
  REJECTED: "bg-status-danger-surface text-status-danger-ink",
};


const REGENERABLE_STATUSES = new Set([
  "PREPARING",
  "DRAFT",
  "REOPENED",
  "PREVIEW_READY",
  "EXCEPTIONS_FOUND",
]);

interface StageRowProps {
  row: ApprovalStage;
  canAct: boolean;
  canReopen: boolean;
  isActive: boolean;
  runId: number;
}

function StageRow({ row, canAct, canReopen, isActive, runId }: StageRowProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [comment, setComment] = useState("");
  const { mutate: approve, isPending: approvePending } = useApproveStage();
  const { mutate: reject, isPending: rejectPending } = useRejectStage();
  const { mutate: reopen, isPending: reopenPending } = useReopenRun();

  function handleApproveOpen() { setApproveOpen(true); }
  function handleApproveCancel() { setApproveOpen(false); }

  function handleApproveConfirm() {
    approve(
      { runId, approvalId: row.id },
      {
        onSuccess: () => {
          setApproveOpen(false);
          toast.success("Stage approved");
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  function handleRejectOpen() { setRejectOpen(true); }
  function handleRejectCancel() { setRejectOpen(false); setComment(""); }

  function handleRejectConfirm() {
    const reason = comment.trim();
    if (!reason) return;
    reject(
      { runId, approvalId: row.id, comment: reason },
      {
        onSuccess: (result) => {
          setRejectOpen(false);
          setComment("");
          if (REGENERABLE_STATUSES.has(result.runStatus)) {
            toast.success("Stage rejected. Recalculate the run to include the latest salary profiles.");
            return;
          }
          if (!canReopen) {
            toast.success("Stage rejected. A payroll manager can reopen it so it can be regenerated.");
            return;
          }
          reopen(
            { runId, reason },
            {
              onSuccess: () => {
                toast.success("Run rejected and reopened. Recalculate to include the latest salary profiles.");
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center shrink-0">
          {row.stage}
        </span>
        <span className="text-sm font-medium flex-1">{row.stageName}</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_BADGE[row.status] ?? ""}`}>
          {row.status}
        </span>
      </div>

      {row.actedByMembershipId !== null && (
        <p className="text-xs text-muted-foreground pl-9">
          by {row.approverName}{row.actedAt ? ` · ${formatShortDate(row.actedAt)}` : ""}
        </p>
      )}
      {row.comment && (
        <p className="text-xs text-muted-foreground italic pl-9">&quot;{row.comment}&quot;</p>
      )}

      {isActive && canAct && row.isCurrentUserApprover !== false && (
        <div className="flex gap-2 pl-9 pt-1">
          <Button size="sm" variant="outline" className="" onClick={handleApproveOpen} disabled={approvePending}>
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleRejectOpen} disabled={rejectPending}>
            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
      {isActive && canAct && row.isCurrentUserApprover === false && (
        <p className="text-xs text-muted-foreground pl-9 pt-1">
          Waiting on{row.approverName ? ` ${row.approverName}` : " approver"} to act
        </p>
      )}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Stage?</DialogTitle>
            <DialogDescription>
              Confirm approval of &quot;{row.stageName}&quot;. This advances the payroll approval chain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleApproveCancel} disabled={approvePending}>Cancel</Button>
            <LoadingButton onClick={handleApproveConfirm} isPending={approvePending} loadingText="Approving…">
              Approve
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Stage</DialogTitle>
            <DialogDescription>Provide a reason for rejection (required).</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason…"
            value={comment}
            onChange={handleCommentChange}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectCancel} disabled={rejectPending}>Cancel</Button>
            <LoadingButton
              variant="destructive"
              onClick={handleRejectConfirm}
              isPending={rejectPending || reopenPending}
              disabled={!comment.trim()}
              loadingText="Rejecting…"
            >
              Reject
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ApprovalStagePanel({ runId, status }: Props) {
  const canView = useCan("payroll:runs:view");
  const canApprove = useCan("payroll:runs:approve");
  const canReopen = useCan("payroll:runs:manage");
  const visible = VISIBLE_STATUSES.has(status) && canView;
  const { data, isLoading, isError, error, refetch } = useRunApprovals(runId, { enabled: visible });

  if (!visible) return null;

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold">Approval Stages</p>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="w-full h-8 rounded" />
          <Skeleton className="w-full h-8 rounded" />
          <Skeleton className="w-full h-8 rounded" />
        </div>
      )}

      {!isLoading && isError && !data && (
        <div role="alert" className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex-1">Couldn&apos;t load approval stages. {getErrorMessage(error)}</span>
          <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No approval stages configured.</p>
      )}

      {!isLoading && data && status === "PENDING_APPROVAL" && data.every((row) => row.status !== "PENDING") && (
        <p className="text-sm text-muted-foreground">
          Approval is no longer waiting on a stage. Recalculate the run to pull in salary profiles, or reopen it from the actions above.
        </p>
      )}

      {!isLoading && data && data.map((row) => (
        <StageRow
          key={row.id}
          row={row}
          canAct={canApprove}
          canReopen={canReopen}
          isActive={row.status === "PENDING" && status === "PENDING_APPROVAL"}
          runId={runId}
        />
      ))}
    </div>
  );
}
