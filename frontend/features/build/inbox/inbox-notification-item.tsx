"use client";

import * as React from "react";
import {
  Bell,
  AtSign,
  UserCheck,
  GitPullRequest,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType, NotificationCategory } from "@/types/notifications";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { getStatusDotClass, getStatusBadgeClass } from "@/components/shared/ticket-status-badge";
import { priorityConfig, statusConfig } from "@/features/build/shared/types";
import { parseInboxTicketLink } from "./parse-inbox-ticket-link";

interface InboxNotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (notification: Notification) => void;
}

const PRIORITY_ICONS = {
  URGENT: AlertTriangle,
  HIGH: ArrowUp,
  MEDIUM: Minus,
  LOW: ArrowDown,
} as const;

type PriorityKey = keyof typeof PRIORITY_ICONS;

function resolvePriorityKey(priority: string): PriorityKey {
  const key = priority.toUpperCase();
  if (key in PRIORITY_ICONS) return key as PriorityKey;
  return "MEDIUM";
}

function getCategoryIcon(
  category: NotificationCategory,
  type: NotificationType,
): React.ReactNode {
  if (category === "PROJECTS") {
    if (type === "SUCCESS") return <CheckCircle className="h-3.5 w-3.5 text-status-success-ink" />;
    if (type === "WARNING") return <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" />;
    if (type === "ERROR") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (category === "HRMS") return <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />;
  if (category === "CHAT") return <AtSign className="h-3.5 w-3.5 text-primary" />;
  if (type === "SUCCESS") return <CheckCircle className="h-3.5 w-3.5 text-status-success-ink" />;
  if (type === "WARNING") return <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" />;
  if (type === "ERROR") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  if (type === "INFO") return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

function formatStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status.replace(/_/g, " ");
}

export const InboxNotificationItem = React.memo(function InboxNotificationItem({
  notification,
  isSelected,
  onSelect,
}: InboxNotificationItemProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const ticket = notification.ticketContext ?? null;
  const linkTarget = parseInboxTicketLink(notification.link);
  const ticketKey = ticket?.ticketKey ?? linkTarget?.ticketKey ?? null;
  const priority = ticket?.priority ?? null;
  const status = ticket?.status ?? null;
  const ticketType = ticket?.type ?? null;
  const assignee = ticket?.assignee ?? null;
  const hasMeta = Boolean(ticketKey || priority || status || ticketType || assignee);

  React.useEffect(() => {
    if (!isSelected || !rowRef.current) return;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isSelected]);

  function handleClick() {
    onSelect(notification);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(notification);
    }
  }

  const priorityKey = priority ? resolvePriorityKey(priority) : null;
  const PriorityIcon = priorityKey ? PRIORITY_ICONS[priorityKey] : null;
  const priorityCfg = priorityKey
    ? (priorityConfig[priorityKey] ?? priorityConfig.MEDIUM)
    : null;

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-start gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0",
        "cursor-pointer transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
        !notification.isRead && !isSelected && "bg-card",
        !notification.isRead && "border-l-2 border-l-primary pl-2.5",
        notification.isRead && "border-l-2 border-l-transparent pl-2.5",
      )}
    >
      {!notification.isRead && (
        <span
          aria-hidden="true"
          className="absolute left-1 top-3.5 h-1.5 w-1.5 rounded-full bg-primary"
        />
      )}

      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60">
        {getCategoryIcon(notification.category, notification.type)}
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <TruncatedText
            text={notification.title}
            className={cn(
              "min-w-0 flex-1 text-label leading-snug",
              notification.isRead
                ? "font-normal text-muted-foreground"
                : "font-medium text-foreground",
            )}
          />
          <span className="shrink-0 pt-0.5 text-dense tabular-nums text-muted-foreground">
            {formatTimestamp(notification.createdAt)}
          </span>
        </div>

        {notification.message ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {notification.message}
          </p>
        ) : null}

        {hasMeta ? (
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {ticketKey ? (
              <span className="inline-flex max-w-[9rem] items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-micro font-medium text-muted-foreground">
                <TruncatedText text={ticketKey} className="min-w-0" />
              </span>
            ) : null}

            {ticketType ? (
              <span className="inline-flex items-center gap-1 text-micro font-medium text-muted-foreground">
                <TicketTypeIcon type={ticketType} size="sm" />
                <span className="capitalize">{ticketType.toLowerCase()}</span>
              </span>
            ) : null}

            {priority && PriorityIcon && priorityCfg ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-micro font-medium",
                  priorityCfg.color,
                )}
              >
                <PriorityIcon className="h-3 w-3 shrink-0" />
                {priorityCfg.label}
              </span>
            ) : null}

            {status ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-micro font-medium",
                  getStatusBadgeClass(status),
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getStatusDotClass(status))}
                  aria-hidden="true"
                />
                {formatStatusLabel(status)}
              </span>
            ) : null}

            {assignee ? (
              <span className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 text-micro text-muted-foreground">
                <Avatar className="h-3.5 w-3.5 shrink-0">
                  <AvatarImage src={resolveImageUrl(assignee.image)} />
                  <AvatarFallback className="bg-primary/10 text-micro font-medium text-primary">
                    {getUserInitials(assignee)}
                  </AvatarFallback>
                </Avatar>
                <TruncatedText
                  text={getUserDisplayName(assignee)}
                  className="min-w-0 font-medium"
                />
              </span>
            ) : null}
          </div>
        ) : notification.sourceModule ? (
          <span className="mt-1 inline-flex items-center text-micro font-medium uppercase tracking-wide text-muted-foreground/70">
            {notification.sourceModule}
          </span>
        ) : null}
      </div>
    </div>
  );
});
