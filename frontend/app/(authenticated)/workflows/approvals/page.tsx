"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import {
  usePendingApprovals,
  useHandleApproval,
  type WorkflowApproval,
} from "@/hooks/api/workflows";

function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: {
  approval: WorkflowApproval;
  onApprove: (a: WorkflowApproval) => void;
  onReject: (a: WorkflowApproval) => void;
}) {
  function handleApprove() {
    onApprove(approval);
  }

  function handleReject() {
    onReject(approval);
  }

  return (
    <Card className="bg-card rounded-xl border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">
                {approval.workflow?.name ?? "Workflow"}
              </p>
              <Badge
                variant="secondary"
                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
              >
                Pending
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Execution: {approval.executionId.slice(0, 8)}...
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>
                Created {format(new Date(approval.createdAt), "MMM d, HH:mm")}
              </span>
              {approval.expiresAt && (
                <span className="text-orange-600">
                  Expires{" "}
                  {format(new Date(approval.expiresAt), "MMM d, HH:mm")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={handleApprove}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:hover:bg-red-500/10"
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [selectedApproval, setSelectedApproval] =
    useState<WorkflowApproval | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, isError, refetch } = usePendingApprovals();
  const handleApproval = useHandleApproval();

  const pendingApprovals = data?.filter((a) => a.status === "pending") ?? [];

  function handleOpenApprove(approval: WorkflowApproval) {
    setSelectedApproval(approval);
    setDialogAction("approve");
    setDialogOpen(true);
  }

  function handleOpenReject(approval: WorkflowApproval) {
    setSelectedApproval(approval);
    setDialogAction("reject");
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setSelectedApproval(null);
    setComment("");
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) handleCloseDialog();
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  function handleSubmitAction() {
    if (!selectedApproval) return;
    handleApproval.mutate(
      {
        approvalId: selectedApproval.id,
        action: dialogAction,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(
            dialogAction === "approve"
              ? "Request approved"
              : "Request rejected",
          );
          handleCloseDialog();
        },
        onError: () => toast.error("Failed to process approval"),
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Approval Center"
      subtitle="Review and act on pending workflow approvals"
      actions={
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          {pendingApprovals.length} pending
        </span>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState
          title="Failed to load approvals"
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : pendingApprovals.length === 0 ? (
        <EmptyState
          illustration={<EmptyApprovalIllustration />}
          title="No pending approvals"
          description="All workflow approval requests have been handled."
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="space-y-3">
          {pendingApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleOpenApprove}
              onReject={handleOpenReject}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {dialogAction === "approve"
                ? "Optionally add a comment before approving."
                : "Optionally add a reason for rejection."}
            </p>
            <Textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={handleCommentChange}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={handleApproval.isPending}
              className={
                dialogAction === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {dialogAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
