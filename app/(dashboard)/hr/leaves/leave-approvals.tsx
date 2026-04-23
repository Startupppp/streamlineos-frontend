"use client";

import React, { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useHrPendingWfhRequests, useProcessWfhRequest, useApproveLeaveDedicated, useRejectLeaveDedicated } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration, EmptyCalendarIllustration } from "@/components/illustrations";
import { Home, CheckCircle2, XCircle, Loader2, CalendarDays, Clock, UserCheck, AlertTriangle } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeIn } from "@/lib/motion-variants";

import type { LeaveRequest, WfhRequest } from "./leaves-shared";
import { WfhRequestItem, priorityConfig } from "./leaves-shared";

function LeaveStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: Clock,
    },
    APPROVED: {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle2,
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      icon: XCircle,
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      icon: XCircle,
    },
  };
  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${c.className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.label}
    </Badge>
  );
}

function LeaveApprovalItem({
  req,
  processingId,
  onProcess,
}: {
  req: LeaveRequest;
  processingId: number | null;
  onProcess: (requestId: number, status: "APPROVED" | "REJECTED") => void;
}) {
  const status = req.status ?? "PENDING";
  const isPending = status === "PENDING";
  const priority = req.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const lopDays = Number(req.lopDays ?? 0);

  const handleApprove = useCallback(() => onProcess(req.id, "APPROVED"), [req.id, onProcess]);
  const handleReject = useCallback(() => onProcess(req.id, "REJECTED"), [req.id, onProcess]);

  return (
    <div className="rounded-xl bg-muted/30 border border-border" role="listitem">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={resolveImageUrl(req.user?.image)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                {req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user?.email}
              </p>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 gap-1 ${pConfig.textColor} border-current/20`}>
                <span className={`h-1.5 w-1.5 rounded-full ${pConfig.dotColor}`} />
                {pConfig.label}
              </Badge>
              {lopDays > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-orange-600 border-orange-400/30 bg-orange-500/10">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  LOP: {lopDays}d
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {req.leaveType?.name} · {format(new Date(req.startDate), "MMM dd")} –{" "}
              {format(new Date(req.endDate), "MMM dd, yyyy")}
            </p>
            {req.reason && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.reason}</p>
            )}
            {!isPending && req.approver?.name && status !== "CANCELLED" && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" aria-hidden="true" />
                {status === "APPROVED" ? "Approved" : "Rejected"} by {req.approver.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {isPending ? (
            <>
              <Button size="sm" variant="default" className="h-8" disabled={processingId === req.id} onClick={handleApprove}>
                {processingId === req.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-8" disabled={processingId === req.id} onClick={handleReject}>
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          ) : (
            <LeaveStatusBadge status={status} />
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveApprovalsList({ requests }: { requests: LeaveRequest[] }) {
  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const processingId = approveMutation.variables?.leaveId ?? rejectMutation.variables?.leaveId ?? null;
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const handleProcess = useCallback((requestId: number, status: "APPROVED" | "REJECTED") => {
    if (status === "APPROVED") {
      approveMutation.mutate(
        { leaveId: requestId },
        {
          onSuccess: () => toast.success("Request approved successfully"),
          onError: (err) => toast.error(err.message || "Failed to approve"),
        },
      );
    } else {
      rejectMutation.mutate(
        { leaveId: requestId, reason: "" },
        {
          onSuccess: () => toast.success("Request rejected successfully"),
          onError: (err) => toast.error(err.message || "Failed to reject"),
        },
      );
    }
  }, [approveMutation, rejectMutation]);

  return (
    <div className="space-y-4" role="list" aria-label="Leave approvals">
      {requests.map((req) => (
        <LeaveApprovalItem
          key={req.id}
          req={req}
          processingId={isPending ? (processingId ?? null) : null}
          onProcess={handleProcess}
        />
      ))}
    </div>
  );
}

interface LeaveApprovalsContentProps {
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  isLoading?: boolean;
}

export function LeaveApprovalsContent({
  incomingLeaveRequests,
  allIncomingLeaveRequests,
}: LeaveApprovalsContentProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingWfhRequests } = useHrPendingWfhRequests();
  const processWfhRequestMutation = useProcessWfhRequest();

  const handleRejectionReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectionReason(e.target.value);
  }, []);

  const handleWfhApprove = useCallback((requestId: number) => {
    processWfhRequestMutation.mutate(
      { requestId, status: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("WFH request approved");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [processWfhRequestMutation]);

  const handleWfhRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  }, []);

  const handleWfhRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    processWfhRequestMutation.mutate(
      { requestId: rejectingId, status: "REJECTED", rejectionReason: rejectionReason || undefined },
      {
        onSuccess: () => {
          toast.success("WFH request rejected");
          setRejectDialogOpen(false);
          setRejectionReason("");
          setRejectingId(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [rejectingId, rejectionReason, processWfhRequestMutation]);

  const handleRejectCancel = useCallback(() => {
    setRejectDialogOpen(false);
    setRejectionReason("");
    setRejectingId(null);
  }, []);

  const approvedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "APPROVED"),
    [allIncomingLeaveRequests]
  );
  const rejectedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "REJECTED"),
    [allIncomingLeaveRequests]
  );

  return (
    <>
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Leave Requests
              {allIncomingLeaveRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{allIncomingLeaveRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-muted/50 border border-border p-1 rounded-lg h-auto gap-1">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                >
                  All
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                    {allIncomingLeaveRequests.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                >
                  Pending
                  {incomingLeaveRequests.length > 0 && (
                    <Badge className="ml-1.5 h-5 min-w-5 px-1.5 bg-amber-500 text-white text-[10px] font-bold border-0">
                      {incomingLeaveRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                >
                  Approved
                  {approvedRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                      {approvedRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                >
                  Rejected
                  {rejectedRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                      {rejectedRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {allIncomingLeaveRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No leave requests" description="There are no leave requests to display." />
                ) : (
                  <LeaveApprovalsList requests={allIncomingLeaveRequests} />
                )}
              </TabsContent>
              <TabsContent value="pending">
                {incomingLeaveRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No pending leave requests" description="All leave requests have been processed." />
                ) : (
                  <LeaveApprovalsList requests={incomingLeaveRequests} />
                )}
              </TabsContent>
              <TabsContent value="approved">
                {approvedRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No approved leave requests" description="No leave requests have been approved yet." />
                ) : (
                  <LeaveApprovalsList requests={approvedRequests} />
                )}
              </TabsContent>
              <TabsContent value="rejected">
                {rejectedRequests.length === 0 ? (
                  <EmptyState illustration={<EmptyApprovalIllustration />} title="No rejected leave requests" description="No leave requests have been rejected." />
                ) : (
                  <LeaveApprovalsList requests={rejectedRequests} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" aria-hidden="true" />
              Pending WFH Requests
              {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingWfhRequests.length}</Badge>
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
            <SheetTitle className="text-base">Reject WFH Request</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
          </SheetHeader>
          <div className="flex-1 p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="E.g. Not enough prior notice, project deadline..."
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 p-5 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={handleRejectCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleWfhRejectConfirm}
              disabled={processWfhRequestMutation.isPending}
            >
              {processWfhRequestMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Reject Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {processWfhRequestMutation.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}

function WfhApprovalActions({
  requestId,
  isPending,
  onApprove,
  onRejectOpen,
}: {
  requestId: number;
  isPending: boolean;
  onApprove: (id: number) => void;
  onRejectOpen: (id: number) => void;
}) {
  const handleApprove = useCallback(() => onApprove(requestId), [requestId, onApprove]);
  const handleReject = useCallback(() => onRejectOpen(requestId), [requestId, onRejectOpen]);

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="default" onClick={handleApprove} disabled={isPending} className="h-8">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={handleReject} disabled={isPending} className="h-8">
        <XCircle className="h-3 w-3 mr-1" />
        Reject
      </Button>
    </div>
  );
}
