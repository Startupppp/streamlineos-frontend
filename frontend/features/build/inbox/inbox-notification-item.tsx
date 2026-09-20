"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "@/lib/date-utils";
import { distinctNotificationBody } from "@/lib/notification-copy";
import { NOTIFICATION_TYPE_CONFIG } from "@/lib/notification-types";
import type { Notification } from "@/types/notifications";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
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

const PRIORITY_KEYS = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly PriorityKey[];

function resolvePriorityKey(priority: string): PriorityKey {
  const key = priority.toUpperCase();
  return PRIORITY_KEYS.find((candidate) => candidate === key) ?? "MEDIUM";
}

function formatStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status.replace(/_/g, " ");
}

function createdAtIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export const InboxNotificationItem = React.memo(function InboxNotificationItem({
  notification,
  isSelected,
  onSelect,
}: InboxNotificationItemProps) {
  const rowRef = React.useRef<HTMLButtonElement>(null);
  const ticket = notification.ticketContext ?? null;
  const linkTarget = parseInboxTicketLink(notification.link);
  const ticketKey = ticket?.ticketKey ?? linkTarget?.ticketKey ?? null;
  const priority = ticket?.priority ?? null;
  const status = ticket?.status ?? null;
  const ticketType = ticket?.type ?? null;
  const assignee = ticket?.assignee ?? null;
  const hasMeta = Boolean(ticketKey || priority || status || ticketType || assignee);
  const body = distinctNotificationBody(notification.title, notification.message);
  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
  const TypeIcon = typeConfig.icon;
  const isUnread = !notification.isRead;
  const createdLabel = formatRelativeTime(notification.createdAt);
  const createdExact = formatDateTime(notification.createdAt);

  React.useEffect(() => {
    if (!isSelected || !rowRef.current) return;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isSelected]);

  function handleClick() {
    onSelect(notification);
  }

  const priorityKey = priority ? resolvePriorityKey(priority) : null;
  const PriorityIcon = priorityKey ? PRIORITY_ICONS[priorityKey] : null;
  const priorityCfg = priorityKey
    ? (priorityConfig[priorityKey] ?? priorityConfig.MEDIUM)
    : null;

  return (
    <button
      ref={rowRef}
      type="button"
      aria-pressed={isSelected}
      onClick={handleClick}
      className={cn(
        "relative flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0",
        "cursor-pointer transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isSelected
          ? "bg-primary/10 hover:bg-primary/15"
          : isUnread
            ? "bg-primary/5 hover:bg-primary/10"
            : "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          typeConfig.bg,
        )}
      >
        <TypeIcon className={cn("h-4 w-4", typeConfig.iconColor)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <TruncatedText
            text={notification.title}
            className={cn(
              "min-w-0 flex-1 text-sm leading-snug text-pretty",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground",
            )}
          />
          {isUnread ? (
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
        </div>

        {body ? (
          <TruncatedText
            text={body}
            lines={2}
            className="mt-1 text-xs leading-relaxed text-pretty text-muted-foreground"
          />
        ) : null}

        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          {hasMeta ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
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
                  <Avatar className="h-4 w-4 shrink-0">
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
          ) : null}

          {createdLabel ? (
            <time
              dateTime={createdAtIso(notification.createdAt)}
              title={createdExact}
              className="shrink-0 text-dense tabular-nums text-muted-foreground"
            >
              {createdLabel}
            </time>
          ) : null}
        </div>
      </div>
    </button>
  );
});
