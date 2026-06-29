"use client";

import React, { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useHrPendingWfhRequests, useProcessWfhRequest, useApproveLeaveDedicated, useRejectLeaveDedicated } from "@/hooks/api/hr";
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
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeIn } from "@/lib/motion-variants";

import type { LeaveRequest, WfhRequest } from "./leaves-shared";
import { WfhRequestItem, priorityConfig } from "./leaves-shared";

function LeaveStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
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
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      icon: XCircle,
    },
  };
  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", c.className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.label}
    </span>
  );
}

function LeaveApprovalItem({
  req,
  processingId,
  currentUserId,
  onProcess,
}: {
  req: LeaveRequest;
  processingId: number | null;
  currentUserId: string | undefined;
  onProcess: (requestId: number, status: "APPROVED" | "REJECTED") => void;
}) {
  const status = req.status ?? "PENDING";
  const isPending = status === "PENDING";
  const priority = req.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const lopDays = Number(req.lopDays ?? 0);
  const isSelfRequest = !!currentUserId && req.user?.id === currentUserId;

  const handleApprove = useCallback(() => onProcess(req.id, "APPROVED"), [req.id, onProcess]);
  const handleReject = useCallback(() => onProcess(req.id, "REJECTED"), [req.id, onProcess]);

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border overflow-hidden transition-colors duration-200 hover:bg-muted/20 border-l-4",
        status === "APPROVED" ? "border-l-emerald-500" :
        status === "REJECTED" ? "border-l-rose-500" :
        "border-l-amber-500"
      )}
      role="listitem"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={resolveImageUrl(req.user?.image)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">
                {req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user?.email}
              </p>
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current/20", pConfig.textColor)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", pConfig.dotColor)} />
                {pConfig.label}
              </span>
              {lopDays > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  LOP: {lopDays}d
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground/80">{req.leaveType?.name}</span>
              {" · "}
              {format(new Date(req.startDate), "MMM dd")} – {format(new Date(req.endDate), "MMM dd, yyyy")}
            </p>
            {req.reason && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.reason}</p>
            )}
            {!isPending && req.approver?.name && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" aria-hidden="true" />
                {status === "APPROVED" ? "Approved" : "Rejected"} by {req.approver.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {isPending ? (
            isSelfRequest ? (
              <span className="text-xs text-muted-foreground italic">Cannot approve own request</span>
            ) : (
              <>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold px-3 gap-1 border-0 transition-colors duration-200"
                  disabled={processingId === req.id}
                  onClick={handleApprove}
                >
                  {processingId === req.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-transparent border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold px-3 gap-1 transition-colors duration-200"
                  disabled={processingId === req.id}
                  onClick={handleReject}
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
              </>
            )
          ) : (
            <LeaveStatusBadge status={status} />
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveApprovalsList({ requests, currentUserId }: { requests: LeaveRequest[]; currentUserId: string | undefined }) {
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
    <div className="space-y-3" role="list" aria-label="Leave approvals">
      {requests.map((req) => (
        <LeaveApprovalItem
          key={req.id}
          req={req}
          processingId={isPending ? (processingId ?? null) : null}
          currentUserId={currentUserId}
          onProcess={handleProcess}
        />
      ))}
    </div>
  );
}

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
        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
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
              <TabsList className="h-auto bg-transparent border-b border-border rounded-none p-0 gap-0 w-full justify-start min-w-max">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs font-medium transition-colors duration-200"
                >
                  All
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {allIncomingLeaveRequests.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs font-medium transition-colors duration-200"
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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs font-medium transition-colors duration-200"
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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2 px-4 text-xs font-medium transition-colors duration-200"
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

        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-950/40 flex items-center justify-center">
                <Home className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
              </div>
              Pending WFH Requests
              {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  {pendingWfhRequests.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
            <SheetTitle className="text-base font-semibold">Reject WFH Request</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
          </SheetHeader>
          <div className="flex-1 p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Rejection Reason</Label>
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
            <Button
              variant="destructive"
              className="flex-1 h-9"
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
      <Button
        size="sm"
        className="h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold px-3 gap-1 border-0 transition-colors duration-200"
        onClick={handleApprove}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        Approve
      </Button>
      <Button
        size="sm"
        className="h-7 rounded-full bg-transparent border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold px-3 gap-1 transition-colors duration-200"
        onClick={handleReject}
        disabled={isPending}
      >
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}
