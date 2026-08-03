"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useHrPendingWfhRequests, useProcessWfhRequest } from "@/hooks/api/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration, EmptyCalendarIllustration } from "@/components/illustrations";
import { Home, CalendarDays } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { staggerContainer, fadeIn } from "@/lib/motion-variants";

import type { LeaveRequest, WfhRequest } from "./leaves-shared";
import { WfhRequestItem } from "./leaves-shared";
import { LeaveApprovalsList } from "./leave-approvals-list";
import { WfhApprovalActions } from "./wfh-approval-actions";

interface LeaveApprovalsContentProps {
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  currentUserId?: string;
  isLoading?: boolean;
}

export function LeaveApprovalsContent({
  incomingLeaveRequests,
  allIncomingLeaveRequests,
  currentUserId,
}: LeaveApprovalsContentProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingWfhRequests } = useHrPendingWfhRequests();
  const processWfhRequestMutation = useProcessWfhRequest();

  const handleRejectionReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectionReason(e.target.value);
    },
    [],
  );

  const handleWfhApprove = useCallback(
    (requestId: number) => {
      processWfhRequestMutation.mutate(
        { requestId, status: "APPROVED" },
        {
          onSuccess: () => toast.success("WFH request approved"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [processWfhRequestMutation],
  );

  const handleWfhRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  }, []);

  const handleWfhRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    processWfhRequestMutation.mutate(
      { requestId: rejectingId, status: "REJECTED", rejectionReason: reason },
      {
        onSuccess: () => {
          toast.success("WFH request rejected");
          setRejectDialogOpen(false);
          setRejectionReason("");
          setRejectingId(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [rejectingId, rejectionReason, processWfhRequestMutation]);

  const handleRejectCancel = useCallback(() => {
    setRejectDialogOpen(false);
    setRejectionReason("");
    setRejectingId(null);
  }, []);

  const approvedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "APPROVED"),
    [allIncomingLeaveRequests],
  );
  const rejectedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "REJECTED"),
    [allIncomingLeaveRequests],
  );

  return (
    <>
      <div className="space-y-6">
        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </div>
              Leave Requests
              {allIncomingLeaveRequests.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {allIncomingLeaveRequests.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-transparent border-b rounded-none p-0 gap-0">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs duration-200"
                >
                  All
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {allIncomingLeaveRequests.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs duration-200"
                >
                  Pending
                  {incomingLeaveRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {incomingLeaveRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs duration-200"
                >
                  Approved
                  {approvedRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {approvedRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs duration-200"
                >
                  Rejected
                  {rejectedRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {rejectedRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {allIncomingLeaveRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No leave requests" description="There are no leave requests to display." />
                ) : (
                  <LeaveApprovalsList requests={allIncomingLeaveRequests} currentUserId={currentUserId} />
                )}
              </TabsContent>
              <TabsContent value="pending">
                {incomingLeaveRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No pending leave requests" description="All leave requests have been processed." />
                ) : (
                  <LeaveApprovalsList requests={incomingLeaveRequests} currentUserId={currentUserId} />
                )}
              </TabsContent>
              <TabsContent value="approved">
                {approvedRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No approved leave requests" description="No leave requests have been approved yet." />
                ) : (
                  <LeaveApprovalsList requests={approvedRequests} currentUserId={currentUserId} />
                )}
              </TabsContent>
              <TabsContent value="rejected">
                {rejectedRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No rejected leave requests" description="No leave requests have been rejected." />
                ) : (
                  <LeaveApprovalsList requests={rejectedRequests} currentUserId={currentUserId} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-7 rounded-lg bg-muted flex items-center justify-center">
                <Home className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </div>
              Pending WFH Requests
              {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {pendingWfhRequests.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!pendingWfhRequests || pendingWfhRequests.length === 0 ? (
              <EmptyState illustration={<EmptyCalendarIllustration />} title="No pending WFH requests" description="All WFH requests have been processed." />
            ) : (
              <motion.div
                className="space-y-3"
                role="list"
                aria-label="Pending WFH approvals"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {pendingWfhRequests.map((req) => (
                  <motion.div key={req.id} variants={fadeIn}>
                    <WfhRequestItem
                      request={req as WfhRequest}
                      showUser
                      actions={
                        <WfhApprovalActions
                          requestId={req.id}
                          isPending={processWfhRequestMutation.isPending}
                          onApprove={handleWfhApprove}
                          onRejectOpen={handleWfhRejectOpen}
                        />
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent className="sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="p-5 pb-4 border-b">
            <SheetTitle className="text-base font-semibold">Reject WFH Request</SheetTitle>
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
                placeholder="E.g. Not enough prior notice, project deadline..."
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                rows={4}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 p-5 pt-4 border-t">
            <Button variant="outline" className="flex-1 h-9" onClick={handleRejectCancel}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              className="flex-1 h-9"
              onClick={handleWfhRejectConfirm}
              isPending={processWfhRequestMutation.isPending}
              disabled={!rejectionReason.trim()}
              loadingText="Rejecting…"
            >
              Reject Request
            </LoadingButton>
          </div>
        </SheetContent>
      </Sheet>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {processWfhRequestMutation.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}
