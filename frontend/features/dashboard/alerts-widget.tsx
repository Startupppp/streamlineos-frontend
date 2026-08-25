"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BellRing } from "lucide-react";
import { WidgetCard } from "@/components/ui/widget-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import {
  useUnreadNotifications,
  useMarkNotificationRead,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_PRIORITY_CONFIG,
  type NotificationPriority,
} from "@/features/notifications/notification-types";
import { formatRelativeTime } from "@/features/notifications/format-relative-time";
import type { Notification } from "@/types/notifications";

const ALERT_DISPLAY_LIMIT = 5;
const IMPORTANT_PRIORITIES: readonly NotificationPriority[] = ["CRITICAL", "HIGH"];

function isImportant(notification: Notification): boolean {
  return IMPORTANT_PRIORITIES.includes(notification.priority);
}

function priorityRank(priority: NotificationPriority): number {
  return priority === "CRITICAL" ? 0 : 1;
}

function AlertRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}) {
  const priority = NOTIFICATION_PRIORITY_CONFIG[notification.priority];
  const handleClick = useCallback(
    () => onOpen(notification),
    [onOpen, notification],
  );

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-start gap-2.5 rounded-lg border border-border/60 px-2.5 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <span
          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", priority.dotColor)}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <TruncatedText text={notification.title} className="text-xs font-medium" />
          {notification.message && (
            <p className="truncate text-micro text-muted-foreground">
              {notification.message}
            </p>
          )}
          <p className="mt-0.5 text-micro text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("h-4 shrink-0 px-1.5 py-0 text-micro", priority.color)}
        >
          {priority.label}
        </Badge>
      </button>
    </li>
  );
}

export function AlertsWidget() {
  const router = useRouter();
  const { data: session } = useSession();
  const markRead = useMarkNotificationRead();

  const { data, isLoading, error } = useUnreadNotifications({
    enabled: !!session?.orgId,
  });

  const alerts = useMemo(() => {
    return (data ?? [])
      .filter(isImportant)
      .sort((a, b) => {
        const rank = priorityRank(a.priority) - priorityRank(b.priority);
        if (rank !== 0) return rank;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, ALERT_DISPLAY_LIMIT);
  }, [data]);

  const handleOpen = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) markRead.mutate(notification.id);
      router.push(notification.link ?? "/notifications");
    },
    [markRead, router],
  );

  return (
    <WidgetCard
      icon={BellRing}
      iconClassName="text-primary"
      title="Important Alerts"
      badge={alerts.length || undefined}
      link={{ href: "/notifications", label: "All" }}
      isLoading={isLoading}
      error={error}
      loadingRows={3}
      isEmpty={!alerts.length}
      empty={
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-20 w-20" />}
          title="No important alerts"
          description="High and critical notifications will appear here."
          compact
        />
      }
    >
      <ul className="space-y-2 overflow-y-auto max-h-64">
        {alerts.map((notification) => (
          <AlertRow
            key={notification.id}
            notification={notification}
            onOpen={handleOpen}
          />
        ))}
      </ul>
    </WidgetCard>
  );
}
