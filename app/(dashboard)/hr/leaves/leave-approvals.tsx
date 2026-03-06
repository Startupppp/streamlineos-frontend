"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyApprovalIllustration,
  EmptyCalendarIllustration,
} from "@/components/illustrations";

import {
  Home,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarDays,
} from "lucide-react";

import { resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeIn } from "@/lib/motion-variants";

import type { LeaveRequest, WfhRequest } from "./leaves-shared";
import { WfhRequestItem } from "./leaves-shared";

/* ─── LeaveApprovalsList (internal) ─── */

function LeaveApprovalsList({ requests }: { requests: LeaveRequest[] }) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const router = useRouter();

  async function handleProcess(requestId: number, status: "APPROVED" | "REJECTED") {
    setProcessingId(requestId);
    const { processLeaveRequest } = await import("@/server/actions/leave-actions");
    const res = await processLeaveRequest({ requestId, status });
    setProcessingId(null);

    if (res.success) {
      toast.success(`Request ${status.toLowerCase()} successfully`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to process");
    }
  }

  return (
    <div className="space-y-4" role="list" aria-label="Pending leave approvals">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border"
          role="listitem"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={resolveImageUrl(req.user?.image)} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {req.user?.firstName?.[0]}
                {req.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {req.user?.firstName
                  ? `${req.user.firstName} ${req.user.lastName}`
                  : req.user?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {req.leaveType?.name} · {format(new Date(req.startDate), "MMM dd")} –{" "}
                {format(new Date(req.endDate), "MMM dd, yyyy")}
              </p>
              {req.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8"
              disabled={processingId === req.id}
              onClick={() => handleProcess(req.id, "APPROVED")}
            >
              {processingId === req.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={processingId === req.id}
              onClick={() => handleProcess(req.id, "REJECTED")}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Props ─── */

interface LeaveApprovalsContentProps {
  incomingLeaveRequests: LeaveRequest[];
}

/* ─── Component ─── */

export function LeaveApprovalsContent({
  incomingLeaveRequests,
}: LeaveApprovalsContentProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = api.useUtils();

  const { data: pendingWfhRequests } =
    api.hr.getPendingWfhRequests.useQuery();

  const processWfhRequest = api.hr.processWfhRequest.useMutation({
    onSuccess: (_, variables) => {
      const action = variables.status === "APPROVED" ? "approved" : "rejected";
      toast.success(`WFH request ${action}`);
      utils.hr.getPendingWfhRequests.invalidate();
      utils.hr.getWfhRequests.invalidate();
      setRejectDialogOpen(false);
      setRejectionReason("");
      setRejectingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process request");
    },
  });

  const handleWfhApprove = useCallback(
    (requestId: number) => {
      processWfhRequest.mutate({ requestId, status: "APPROVED" });
    },
    [processWfhRequest]
  );

  const handleWfhRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  }, []);

  const handleWfhRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    processWfhRequest.mutate({
      requestId: rejectingId,
      status: "REJECTED",
      rejectionReason: rejectionReason || undefined,
    });
  }, [rejectingId, rejectionReason, processWfhRequest]);

  return (
    <>
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Pending Leave Requests
              {incomingLeaveRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {incomingLeaveRequests.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomingLeaveRequests.length === 0 ? (
              <EmptyState
                illustration={<EmptyApprovalIllustration />}
                title="No pending leave requests"
                description="All leave requests have been processed."
              />
            ) : (
              <LeaveApprovalsList requests={incomingLeaveRequests} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" aria-hidden="true" />
              Pending WFH Requests
              {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingWfhRequests.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingWfhRequests || pendingWfhRequests.length === 0 ? (
              <EmptyState
                illustration={<EmptyCalendarIllustration />}
                title="No pending WFH requests"
                description="All WFH requests have been processed."
              />
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleWfhApprove(req.id)}
                            disabled={processWfhRequest.isPending}
                            className="h-8"
                          >
                            {processWfhRequest.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWfhRejectOpen(req.id)}
                            disabled={processWfhRequest.isPending}
                            className="h-8"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Reject WFH Dialog ─── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject WFH Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setRejectingId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWfhRejectConfirm}
              disabled={processWfhRequest.isPending}
            >
              {processWfhRequest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Reject Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── SR Announcement ─── */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {processWfhRequest.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}
