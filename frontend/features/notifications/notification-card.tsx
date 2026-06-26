"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_CONFIG,
  type NotificationType,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";

export interface NotificationCardProps {
  id: number;
  title: string;
  message: string | null;
  type: NotificationType | string | null;
  isRead: boolean;
  createdAt: Date | string | null;
  link?: string | null;
  onClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
}

export function NotificationCard({
  id,
  title,
  message,
  type,
  isRead,
  createdAt,
  link,
  onClick,
}: NotificationCardProps) {
  const typeKey = (type ?? "INFO") as NotificationType;
  const config =
    NOTIFICATION_TYPE_CONFIG[typeKey] ?? NOTIFICATION_TYPE_CONFIG.INFO;
  const Icon = config.icon;
  const isUnread = !isRead;

  return (
    <Card
      onClick={() => onClick({ id, isRead, link: link ?? null })}
      className={cn(
        "group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-400",
        isUnread
          ? "border-l-2 border-l-blue-500 bg-blue-500/[0.03]"
          : "opacity-80 hover:opacity-100",
      )}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            config.bg,
          )}
        >
          <Icon className={cn("h-4 w-4", config.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "text-sm truncate",
                isUnread
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {title}
            </h4>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px] h-4 px-1.5",
                config.badgeBorder,
              )}
            >
              {config.label}
            </Badge>
          </div>
          {message && (
            <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
              {message}
            </p>
          )}
          <span className="mt-1 block text-[11px] text-muted-foreground/70">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {isUnread && (
          <span className="relative flex h-2 w-2 shrink-0 mt-1">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-blue-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
        )}
      </div>
    </Card>
  );
}
