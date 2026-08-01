"use client";

import React, { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import {
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { balanceCardConfig, DEFAULT_CARD_CONFIG, priorityConfig } from "./leaves-shared";
import type { LeaveRequest } from "./leaves-types";

export const RequestHistoryRow = React.memo(function RequestHistoryRow({
  request,
  isAdmin = false,
  isSelf = false,
  onApprove,
  onReject,
  onRevert,
  onCancel,
}: {
  request: LeaveRequest;
  isAdmin?: boolean;
  isSelf?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason?: string) => void;
  onRevert?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const status = request.status ?? "PENDING";
  const typeName = request.leaveType?.name ?? "Leave";
  const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
  const Icon = config.icon;
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;

  const periodStr =
    days === 1
      ? format(start, "MMM d")
      : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;

  const statusBadgeClass =
    status === "PENDING"
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800"
      : status === "APPROVED"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800"
        : status === "CANCELLED"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800";

  const priority = request.priority || "MEDIUM";
  const pConfig =
    priorityConfig[priority] ??
    priorityConfig["MEDIUM"] ?? {
      label: "Medium",
      dotColor: "bg-amber-500",
      textColor: "text-amber-600",
    };

  function handleOpenRejectDialog() {
    setRejectDialogOpen(true);
  }

  function handleConfirmReject(reason: string) {
    setRejectDialogOpen(false);
    onReject?.(request.id, reason || undefined);
  }

  function handleCancelRequest() {
    onCancel?.(request.id);
  }

  function handleApproveRequest() {
    onApprove?.(request.id);
  }

  function handleRevertRequest() {
    onRevert?.(request.id);
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors duration-200">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center",
              config.iconBg,
            )}
          >
            <Icon
              className={cn("h-3.5 w-3.5", config.iconColor)}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <TruncatedText text={typeName.replace(" Leave", "")} className="text-sm font-semibold text-foreground leading-tight" />
            <p className="text-[10px] text-muted-foreground">Leave</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-xs text-muted-foreground tabular-nums hidden md:table-cell">
        {format(createdAt, "MMM d, yyyy")}
      </td>
      <td className="py-3 px-3 text-xs text-foreground font-medium">
        {periodStr}
      </td>
      <td className="py-3 px-3 text-xs text-center font-semibold tabular-nums text-foreground">
        {days}
      </td>
      <td className="py-3 px-3 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", pConfig.dotColor)} />
          <span className={cn("text-[10px] font-semibold", pConfig.textColor)}>
            {pConfig.label}
          </span>
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit",
              statusBadgeClass,
            )}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
          {request.managerComment && (
            <TruncatedText text={`"${request.managerComment}"`} className="text-[10px] text-muted-foreground max-w-[120px]" />
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <span
              className="text-[10px] text-rose-500 dark:text-rose-300 truncate max-w-[120px]"
              title={request.rejectionReason}
            >
              {request.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {isSelf && status === "PENDING" && onCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCancelRequest}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Request
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                {status !== "APPROVED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={handleApproveRequest}
                    className="text-emerald-600"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                )}
                {status !== "REJECTED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={handleOpenRejectDialog}
                    className="text-rose-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                )}
                {(status === "APPROVED" || status === "REJECTED") && (
                  <DropdownMenuItem onClick={handleRevertRequest}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revert to Pending
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <ConfirmWithReasonSheet
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Rejection reason"
        reasonPlaceholder="Reason for rejection"
        reasonRequired
        confirmLabel="Reject"
        onConfirm={handleConfirmReject}
      />
    </tr>
  );
});
