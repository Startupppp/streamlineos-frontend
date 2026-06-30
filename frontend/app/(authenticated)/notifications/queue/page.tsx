"use client";

import { useState, useCallback } from "react";
import { RefreshCw, RotateCcw, Inbox } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  useNotificationQueue,
  useFailedNotifications,
  useRetryNotification,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_PRIORITY_CONFIG,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import type { Notification } from "@/types/notifications";

type QueueTab = "active" | "failed";

function QueueItem({
  notification,
  onRetry,
  isRetrying,
}: {
  notification: Notification;
  onRetry?: (id: number) => void;
  isRetrying?: boolean;
}) {
  const priorityCfg = NOTIFICATION_PRIORITY_CONFIG[notification.priority] ?? NOTIFICATION_PRIORITY_CONFIG.NORMAL;
  const categoryCfg = notification.category
    ? NOTIFICATION_CATEGORY_CONFIG[notification.category]
    : NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
  const Icon = categoryCfg.icon;

  function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    onRetry?.(notification.id);
  }

  return (
    <Card className="group">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", categoryCfg.bg)}>
          <Icon className={cn("h-4 w-4", categoryCfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{notification.title}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {notification.channel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-4 px-1.5", priorityCfg.color)}
            >
              {priorityCfg.label}
            </Badge>
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{notification.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            #{notification.id} · {categoryCfg.label}
          </p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1" />
            )}
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationQueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTab>("active");
  const [retryingIds, setRetryingIds] = useState<Set<number>>(new Set());

  const {
    data: activeQueue,
    isLoading: activeLoading,
    isError: activeError,
    refetch: refetchActive,
  } = useNotificationQueue();

  const {
    data: failedQueue,
    isLoading: failedLoading,
    isError: failedError,
    refetch: refetchFailed,
  } = useFailedNotifications();

  const retry = useRetryNotification();

  const handleRetry = useCallback(
    (id: number) => {
      setRetryingIds((prev) => new Set(prev).add(id));
      retry.mutate(id, {
        onSuccess: () => {
          toast.success("Retry queued");
          setRetryingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
        onError: () => {
          toast.error("Failed to retry");
          setRetryingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    },
    [retry],
  );

  const handleRefresh = useCallback(() => {
    void refetchActive();
    void refetchFailed();
  }, [refetchActive, refetchFailed]);

  const isLoading = activeTab === "active" ? activeLoading : failedLoading;
  const isError = activeTab === "active" ? activeError : failedError;
  const items: Notification[] = (activeTab === "active" ? activeQueue : failedQueue) ?? [];

  return (
    <PageWrapper
      title="Queue Monitor"
      subtitle="Monitor active delivery queue and retry failed notifications"
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      }
      filters={
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QueueTab)}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="active">
                Active
                {(activeQueue?.length ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                    {activeQueue?.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed
                {(failedQueue?.length ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {failedQueue?.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load queue"
          description="Could not load the notification queue."
          onRetry={handleRefresh}
        />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<Inbox className="h-16 w-16 text-muted-foreground/40" />}
          title={activeTab === "active" ? "Queue is empty" : "No failed notifications"}
          description={
            activeTab === "active"
              ? "All notifications have been delivered. New queued items will appear here."
              : "No failed deliveries. Retried items move back to the active queue."
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <QueueItem
              key={n.id}
              notification={n}
              onRetry={activeTab === "failed" ? handleRetry : undefined}
              isRetrying={retryingIds.has(n.id)}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
