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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType, NotificationCategory } from "@/types/notifications";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

interface InboxNotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (notification: Notification) => void;
}

function getCategoryIcon(
  category: NotificationCategory,
  type: NotificationType,
): React.ReactNode {
  if (category === "PROJECTS") {
    if (type === "SUCCESS") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (type === "WARNING") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (type === "ERROR") return <AlertCircle className="h-4 w-4 text-destructive" />;
    return <GitPullRequest className="h-4 w-4 text-muted-foreground" />;
  }
  if (category === "HRMS") return <UserCheck className="h-4 w-4 text-muted-foreground" />;
  if (category === "CHAT") return <AtSign className="h-4 w-4 text-primary" />;
  if (type === "SUCCESS") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (type === "WARNING") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (type === "ERROR") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (type === "INFO") return <Info className="h-4 w-4 text-muted-foreground" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function InboxNotificationItem({
  notification,
  isSelected,
  onSelect,
}: InboxNotificationItemProps) {
  function handleClick() {
    onSelect(notification);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(notification);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isSelected && "bg-primary/5 border-l-2 border-l-primary",
        !notification.isRead && !isSelected && "bg-card",
      )}
    >
      {!notification.isRead && (
        <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      )}

      <div
        className={cn(
          "mt-0.5 shrink-0 flex items-center justify-center h-7 w-7 rounded-lg border border-border bg-muted",
        )}
      >
        {getCategoryIcon(notification.category, notification.type)}
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p
            className={cn(
              TEXT_ONE_LINE,
              "flex-1 text-[13px] leading-snug",
              notification.isRead ? "text-muted-foreground font-normal" : "text-foreground font-medium",
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatTimestamp(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        )}
        {notification.sourceModule && (
          <span className="mt-1 inline-flex items-center text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">
            {notification.sourceModule}
          </span>
        )}
      </div>
    </div>
  );
}
