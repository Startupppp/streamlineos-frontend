"use client";

import React, { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Heart,
  Palmtree,
  Info,
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { resolveImageUrl } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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

export const balanceCardConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Casual Leave": { label: "CASUAL", color: "bg-blue-500", icon: CalendarDays },
  "Sick Leave": { label: "SICK", color: "bg-red-400", icon: Heart },
  "Unpaid Leave": { label: "UNPAID", color: "bg-slate-400", icon: Palmtree },
};

export const DEFAULT_CARD_CONFIG = { label: "LEAVE", color: "bg-slate-400", icon: CalendarDays };

export const statusIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export const priorityConfig: Record<string, { label: string; dotColor: string; textColor: string }> = {
  HIGH: { label: "High", dotColor: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
  MEDIUM: { label: "Medium", dotColor: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  LOW: { label: "Low", dotColor: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
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

  return (
    <Card className="border-border" role="listitem">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
          <button className="text-muted-foreground hover:text-foreground" aria-label={`Info about ${name}`}>
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">{Math.floor(balanceNum)}</span>
          {total > 0 && (
            <span className="text-lg text-muted-foreground ml-1">/ {total}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
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
            className={`h-full rounded-full transition-all duration-500 ${config.color}`}
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

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
      role="listitem"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showUser && request.user && (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={resolveImageUrl(request.user.image)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {request.user.firstName?.[0]}
              {request.user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {showUser && request.user && (
            <p className="text-sm font-medium text-foreground truncate">
              {request.user.firstName} {request.user.lastName}
            </p>
          )}
          <p className="text-sm text-foreground">
            {format(new Date(request.date), "EEEE, MMM dd, yyyy")}
          </p>
          {request.reason && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{request.reason}</p>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
              Reason: {request.rejectionReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <Badge
          variant="outline"
          className={`text-xs flex items-center gap-1 ${getColorSafe(wfhStatusColors, status)}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {status}
        </Badge>
        {actions}
      </div>
    </div>
  );
});

export const StatsCard = React.memo(function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="border-border" role="listitem">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
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
      : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;

  const statusDotColor =
    status === "PENDING"
      ? "bg-amber-500"
      : status === "APPROVED"
      ? "bg-emerald-500"
      : status === "CANCELLED"
      ? "bg-slate-400"
      : "bg-red-500";

  const priority = request.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            status === "PENDING" ? "bg-amber-500/10" : status === "APPROVED" ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            <Icon className={`h-4 w-4 ${
              status === "PENDING" ? "text-amber-600" : status === "APPROVED" ? "text-emerald-600" : "text-red-600"
            }`} aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-foreground">{typeName.replace(" Leave", "")}<br /><span className="font-normal text-muted-foreground">Leave</span></span>
        </div>
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {format(createdAt, "MMM d, yyyy")}
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {periodStr}
      </td>
      <td className="py-3.5 px-3 text-sm text-foreground text-center">
        {days}
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${pConfig.dotColor}`} />
          <span className={`text-xs font-medium ${pConfig.textColor}`}>
            {pConfig.label}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
            <span className={`text-xs font-medium ${
              status === "PENDING"
                ? "text-amber-600 dark:text-amber-400"
                : status === "APPROVED"
                ? "text-emerald-600 dark:text-emerald-400"
                : status === "CANCELLED"
                ? "text-slate-500 dark:text-slate-400"
                : "text-red-600 dark:text-red-400"
            }`}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          </div>
          {request.managerComment && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={request.managerComment}>
              &ldquo;{request.managerComment}&rdquo;
            </span>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-[140px]" title={request.rejectionReason}>
              {request.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 px-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Actions">
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
                  onClick={() => onCancel(request.id)}
                  className="text-slate-600"
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
                    onClick={() => onApprove?.(request.id)}
                    className="text-emerald-600"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                )}
                {status !== "REJECTED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={() => { setRejectReason(""); setRejectDialogOpen(true); }}
                    className="text-red-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                )}
                {(status === "APPROVED" || status === "REJECTED") && (
                  <DropdownMenuItem
                    onClick={() => onRevert?.(request.id)}
                  >
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
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { setRejectDialogOpen(false); onReject?.(request.id, rejectReason || undefined); }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
});
