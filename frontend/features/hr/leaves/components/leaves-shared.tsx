"use client";

import React from "react";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Heart,
  Palmtree,
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getColorSafe, wfhStatusColors } from "@/lib/theme-constants";
import { TruncatedText } from "@/components/ui/truncated-text";

export type {
  LeaveBalance,
  LeaveType,
  Approver,
  LeaveRequest,
  ApprovedLeave,
  WfhRequest,
} from "./leaves-types";

import type { WfhRequest } from "./leaves-types";

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
    barColor: "bg-status-info-fill",
    valueColor: "text-status-info-ink",
    iconBg: "bg-status-info-surface",
    iconColor: "text-status-info-ink",
    icon: CalendarDays,
  },
  "Sick Leave": {
    label: "SICK",
    barColor: "bg-status-danger-fill",
    valueColor: "text-status-danger-ink",
    iconBg: "bg-status-danger-surface",
    iconColor: "text-status-danger-ink",
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
    dotColor: "bg-status-danger-fill",
    textColor: "text-status-danger-ink",
  },
  MEDIUM: {
    label: "Medium",
    dotColor: "bg-status-warning-fill",
    textColor: "text-status-warning-ink",
  },
  LOW: {
    label: "Low",
    dotColor: "bg-status-success-fill",
    textColor: "text-status-success-ink",
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
      className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden"
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
          <span className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-1">
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
            <AvatarFallback className="text-xs bg-status-info-surface text-status-info-ink">
              {request.user.firstName?.[0]}
              {request.user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {showUser && request.user && (
            <TruncatedText text={`${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()} className="text-sm font-semibold text-foreground" />
          )}
          <p className="text-sm font-medium text-foreground">
            {format(new Date(request.date), "EEE, MMM dd, yyyy")}
          </p>
          {request.reason && (
            <TruncatedText text={request.reason} className="text-xs text-muted-foreground mt-0.5" />
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <p className="text-xs text-status-danger-ink mt-0.5 truncate">
              {request.rejectionReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
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
