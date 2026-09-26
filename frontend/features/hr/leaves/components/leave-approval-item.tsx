"use client";

import { format } from "date-fns";
import { UserCheck, AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

import type { LeaveRequest } from "./leaves-shared";
import { priorityConfig } from "./leaves-shared";
import { LeaveDecisionButtons } from "./leave-decision-controls";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";

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
              {getUserInitials(req.user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">
                {getUserDisplayName(req.user)}
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
          {/* V-044. The same controls /hr/approvals mounts. */}
          <LeaveDecisionButtons
            request={req}
            currentUserId={currentUserId}
            processingId={processingId}
            onProcess={onProcess}
          />
        </div>
      </div>
    </div>
  );
}
