"use client";

import { useState, useCallback } from "react";
import { RefreshCw, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5", categoryCfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", categoryCfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{notification.title}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
            {notification.channel}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-4 px-1.5 shrink-0", priorityCfg.color)}
          >
            {priorityCfg.label}
          </Badge>
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{notification.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          #{notification.id} · {categoryCfg.label}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1 px-2"
          onClick={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          Retry
        </Button>
      )}
    </div>
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
      }
    >
      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <Skeleton className="h-7 w-7 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load queue"
          description="Could not load the notification queue."
          onRetry={handleRefresh}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Server className="h-10 w-10 text-muted-foreground/25 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {activeTab === "active" ? "Queue is empty" : "No failed notifications"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {activeTab === "active"
              ? "All notifications have been delivered."
              : "No failed deliveries. Retried items move back to the active queue."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
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
