"use client";

import React, { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Heart,
  Palmtree,
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getColorSafe, wfhStatusColors } from "@/lib/theme-constants";

export interface LeaveBalance {
  id: number;
  leaveTypeId: number | null;
  balance: string;
  typeName: string | null;
  daysPerYear: number | null;
}

export interface LeaveType {
  id: number;
  name: string;
}

export interface Approver {
  id: string;
  name: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

export interface LeaveRequest {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string | null;
  priority: string | null;
  reason: string | null;
  managerComment?: string | null;
  rejectionReason?: string | null;
  isHalfDay?: boolean;
  halfDayPeriod?: string | null;
  lopDays?: string | number | null;
  createdAt?: string | Date | null;
  leaveType: { name: string } | null;
  approver?: { name: string | null } | null;
  user?: {
    id?: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image?: string | null;
  } | null;
}

export interface ApprovedLeave {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  leaveType: { name: string } | null;
}

export interface WfhRequest {
  id: number;
  date: string;
  reason: string | null;
  status: string | null;
  rejectionReason?: string | null;
  createdAt: string | Date | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export const balanceCardConfig: Record<
  string,
  {
    label: string;
    barColor: string;
    valueColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "Casual Leave": {
    label: "CASUAL",
    barColor: "bg-blue-500",
    valueColor: "text-blue-700 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    icon: CalendarDays,
  },
  "Sick Leave": {
    label: "SICK",
    barColor: "bg-rose-500",
    valueColor: "text-rose-700 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    icon: Heart,
  },
  "Unpaid Leave": {
    label: "UNPAID",
    barColor: "bg-muted-foreground/50",
    valueColor: "text-muted-foreground",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    icon: Palmtree,
  },
};

export const DEFAULT_CARD_CONFIG = {
  label: "LEAVE",
  barColor: "bg-muted-foreground/50",
  valueColor: "text-muted-foreground",
  iconBg: "bg-muted",
  iconColor: "text-muted-foreground",
  icon: CalendarDays,
};

export const statusIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export const priorityConfig: Record<
  string,
  { label: string; dotColor: string; textColor: string }
> = {
  HIGH: {
    label: "High",
    dotColor: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
  },
  MEDIUM: {
    label: "Medium",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  LOW: {
    label: "Low",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
};

export const BalanceCard = React.memo(function BalanceCard({
  typeName,
  balance,
  daysPerYear,
}: {
  typeName: string | null;
  balance: string;
  daysPerYear: number | null;
}) {
  const name = typeName ?? "Leave";
  const config = balanceCardConfig[name] ?? DEFAULT_CARD_CONFIG;
  const balanceNum = parseFloat(balance) || 0;
  const total = daysPerYear ?? 0;
  const pct = total > 0 ? Math.min((balanceNum / total) * 100, 100) : 0;
  const isUnpaid = name.toLowerCase().includes("unpaid");
  const Icon = config.icon;

  return (
    <Card
      className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden"
      role="listitem"
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
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
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {config.label}
          </span>
        </div>

        <div className="mb-0.5">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              config.valueColor,
            )}
          >
            {Math.floor(balanceNum)}
          </span>
          {total > 0 && (
            <span className="text-sm text-muted-foreground ml-1.5">
              / {total}
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-1">
          {isUnpaid ? "Days Taken" : "Days Available"}
        </p>

        <div
          className="h-1.5 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={balanceNum}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${name} balance`}
          aria-valuetext={`${Math.floor(balanceNum)} of ${total} days available`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              config.barColor,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});

export const WfhRequestItem = React.memo(function WfhRequestItem({
  request,
  showUser = false,
  actions,
}: {
  request: WfhRequest;
  showUser?: boolean;
  actions?: React.ReactNode;
}) {
  const status = request.status || "PENDING";
  const StatusIcon = statusIconMap[status] ?? Clock;

  const borderAccent =
    status === "APPROVED"
      ? "border-l-emerald-500"
      : status === "REJECTED"
        ? "border-l-rose-500"
        : "border-l-blue-500";

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl bg-card border border-border border-l-4 hover:bg-muted/30 transition-colors duration-200",
        borderAccent,
      )}
      role="listitem"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showUser && request.user && (
          <Avatar className="w-8 shrink-0">
            <AvatarImage src={resolveImageUrl(request.user.image)} />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              {request.user.firstName?.[0]}
              {request.user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {showUser && request.user && (
            <p className="text-sm font-semibold text-foreground truncate">
              {request.user.firstName} {request.user.lastName}
            </p>
          )}
          <p className="text-sm font-medium text-foreground">
            {format(new Date(request.date), "EEE, MMM dd, yyyy")}
          </p>
          {request.reason && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {request.reason}
            </p>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 truncate">
              {request.rejectionReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            getColorSafe(wfhStatusColors, status),
          )}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
        {actions}
      </div>
    </div>
  );
});

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
  const [rejectReason, setRejectReason] = useState("");

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
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
      : status === "APPROVED"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
        : status === "CANCELLED"
          ? "bg-muted text-muted-foreground border-border dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
          : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";

  const priority = request.priority || "MEDIUM";
  const pConfig =
    priorityConfig[priority] ??
    priorityConfig["MEDIUM"] ?? {
      label: "Medium",
      dotColor: "bg-amber-500",
      textColor: "text-amber-600",
    };

  function handleOpenRejectDialog() {
    setRejectReason("");
    setRejectDialogOpen(true);
  }

  function handleCloseRejectDialog() {
    setRejectDialogOpen(false);
  }

  function handleConfirmReject() {
    setRejectDialogOpen(false);
    onReject?.(request.id, rejectReason || undefined);
  }

  function handleRejectReasonChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    setRejectReason(e.target.value);
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
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {typeName.replace(" Leave", "")}
            </p>
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
            <span
              className="text-[10px] text-muted-foreground truncate max-w-[120px]"
              title={request.managerComment}
            >
              &ldquo;{request.managerComment}&rdquo;
            </span>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <span
              className="text-[10px] text-rose-500 dark:text-rose-400 truncate max-w-[120px]"
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
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejection reason</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={handleRejectReasonChange}
            className="min-h-[80px] resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRejectDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
});
