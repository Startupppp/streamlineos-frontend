"use client";

import React, { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Home } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { useHrPendingWfhRequests } from "@/hooks/api/hr";
import { useDecideWfhRequest } from "@/hooks/api/hr/wfh-decisions";
import { getErrorMessage } from "@/lib/get-error-message";
import { hrmsListStagger, hrmsRowEnter, hrmsRowEnterReduced, hrmsVariants } from "@/lib/hrms/motion";

import { WfhRequestItem } from "./leaves-shared";
import { WfhApprovalActions } from "./wfh-approval-actions";

export function WfhApprovalsCard() {
  const reduced = useReducedMotion();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingWfhRequests, isLoading, isError, error, refetch } =
    useHrPendingWfhRequests();
  const { decide, isPending } = useDecideWfhRequest();

  const wfhState = usePageState({
    permission: "hr:attendance:manage",
    isLoading,
    isError,
    error,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleReasonChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectionReason(event.target.value);
    },
    [],
  );

  const handleApprove = useCallback(
    (requestId: number) => {
      decide(
        { requestId, status: "APPROVED" },
        {
          onSuccess: () => toast.success("WFH request approved"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [decide],
  );

  const handleRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectionReason("");
    setRejectOpen(true);
  }, []);

  const handleRejectCancel = useCallback(() => {
    setRejectOpen(false);
    setRejectingId(null);
    setRejectionReason("");
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    decide(
      { requestId: rejectingId, status: "REJECTED", rejectionReason: reason },
      {
        onSuccess: () => {
          toast.success("WFH request rejected");
          handleRejectCancel();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rejectingId, rejectionReason, decide, handleRejectCancel]);

  const rows = pendingWfhRequests ?? [];

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Home className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Pending WFH Requests
            {rows.length > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning-surface px-1.5 text-micro font-semibold text-status-warning-ink">
                {rows.length}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {wfhState.kind !== "ready" && wfhState.kind !== "empty" ? (
            <PageState
              resolution={wfhState}
              compact
              onRetry={handleRetry}
              loading={<Skeleton className="h-16 w-full rounded-xl" />}
            >
              {null}
            </PageState>
          ) : rows.length === 0 ? (
            <EmptyState
              illustration={<EmptyCalendarIllustration />}
              title="No pending WFH requests"
              description="All WFH requests have been processed."
            />
          ) : (
            <div className="space-y-3" role="list" aria-label="Pending WFH approvals">
              {rows.map((request, index) => (
                <motion.div
                  key={request.id}
                  role="listitem"
                  variants={hrmsVariants(reduced, hrmsRowEnter, hrmsRowEnterReduced)}
                  initial="hidden"
                  animate="show"
                  transition={hrmsListStagger(index)}
                >
                  <WfhRequestItem
                    request={request}
                    showUser
                    actions={
                      <WfhApprovalActions
                        requestId={request.id}
                        isPending={isPending}
                        onApprove={handleApprove}
                        onRejectOpen={handleRejectOpen}
                      />
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={rejectOpen} onOpenChange={setRejectOpen}>
        <SheetContent className="flex flex-col p-0 sm:max-w-sm">
          <SheetHeader className="border-b p-5 pb-4">
            <SheetTitle className="text-base font-semibold">
              Reject WFH Request
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request.
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-4 p-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="wfh-rejection-reason"
                className="text-xs font-medium text-foreground"
              >
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="wfh-rejection-reason"
                placeholder="E.g. Not enough prior notice, project deadline..."
                value={rejectionReason}
                onChange={handleReasonChange}
                rows={4}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 border-t p-5 pt-4">
            <Button
              variant="outline"
              className="h-9 flex-1"
              onClick={handleRejectCancel}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              className="h-9 flex-1"
              onClick={handleRejectConfirm}
              isPending={isPending}
              disabled={!rejectionReason.trim()}
              loadingText="Rejecting…"
            >
              Reject Request
            </LoadingButton>
          </div>
        </SheetContent>
      </Sheet>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isPending ? "Processing WFH request..." : null}
      </div>
    </>
  );
}
