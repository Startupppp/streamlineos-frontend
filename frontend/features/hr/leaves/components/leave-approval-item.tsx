"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle, UserCheck, AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

import type { LeaveRequest } from "./leaves-shared";
import { priorityConfig } from "./leaves-shared";
import { LeaveStatusBadge } from "./leave-status-badge";

interface LeaveApprovalItemProps {
  req: LeaveRequest;
  processingId: number | null;
  currentUserId: string | undefined;
  onProcess: (requestId: number, status: "APPROVED" | "REJECTED") => void;
}

export function LeaveApprovalItem({
  req,
  processingId,
  currentUserId,
  onProcess,
}: LeaveApprovalItemProps) {
  const status = req.status ?? "PENDING";
  const isPending = status === "PENDING";
  const priority = req.priority ?? "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const lopDays = Number(req.lopDays ?? 0);
  const isSelfRequest = !!currentUserId && req.user?.id === currentUserId;

  const handleApprove = useCallback(
    () => onProcess(req.id, "APPROVED"),
    [req.id, onProcess],
  );
  const handleReject = useCallback(
    () => onProcess(req.id, "REJECTED"),
    [req.id, onProcess],
  );

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border overflow-hidden transition-colors duration-200 hover:bg-muted/20 border-l-4",
        status === "APPROVED"
          ? "border-l-emerald-500"
          : status === "REJECTED"
            ? "border-l-rose-500"
            : "border-l-amber-500",
      )}
      role="listitem"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={resolveImageUrl(req.user?.image)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {req.user?.firstName?.[0]}
              {req.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">
                {req.user?.firstName
                  ? `${req.user.firstName} ${req.user.lastName}`
                  : req.user?.email}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border border-current/20",
                  pConfig?.textColor,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", pConfig?.dotColor)} />
                {pConfig?.label}
              </span>
              {lopDays > 0 && (
                <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border border-status-warning-rule bg-status-warning-surface text-status-warning-ink">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  LOP: {lopDays}d
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground/80">
                {req.leaveType?.name}
              </span>
              {" · "}
              {format(new Date(req.startDate), "MMM dd")} –{" "}
              {format(new Date(req.endDate), "MMM dd, yyyy")}
            </p>
            {req.reason && (
              <TruncatedText
                text={req.reason}
                className="text-xs text-muted-foreground mt-0.5"
              />
            )}
            {!isPending && req.approver?.name && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" aria-hidden="true" />
                {status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                {req.approver.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {isPending ? (
            isSelfRequest ? (
              <span className="text-xs text-muted-foreground italic">
                Cannot approve own request
              </span>
            ) : (
              <>
                <LoadingButton
                  size="sm"
                  className="h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-dense font-semibold px-3 gap-1 border-0 transition-colors duration-200"
                  isPending={processingId === req.id}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </LoadingButton>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-transparent border border-destructive/30 text-destructive hover:bg-destructive/10 text-dense font-semibold px-3 gap-1 transition-colors duration-200"
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
