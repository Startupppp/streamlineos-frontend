"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/api/notifications";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Notification, NotificationSection } from "@/types/notifications";
import { InboxNotificationItem } from "./inbox-notification-item";

type InboxTab = NotificationSection | "MENTIONS";

const SECTION_FILTERS: { label: string; value: InboxTab }[] = [
  { label: "Unread", value: "UNREAD" },
  { label: "All", value: "ALL" },
  { label: "Mentions", value: "MENTIONS" },
];

function isInboxTab(value: string): value is InboxTab {
  return value === "UNREAD" || value === "ALL" || value === "MENTIONS";
}

interface InboxListProps {
  selectedId: number | null;
  selectionDismissed?: boolean;
  onSelect: (notification: Notification) => void;
  onClearSelection?: () => void;
  onFilterChange?: () => void;
}

function isMentionNotification(n: Notification): boolean {
  return typeof n.eventKey === "string" && n.eventKey.includes("mention");
}

function InboxListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 border-b border-border px-3 py-2.5">
          <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3.5 w-3/5 rounded" />
              <Skeleton className="h-3 w-12 shrink-0 rounded" />
            </div>
            <Skeleton className="mt-1.5 h-3 w-4/5 rounded" />
            <div className="mt-1.5 flex gap-1.5">
              <Skeleton className="h-4 w-14 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxList({
  selectedId,
  selectionDismissed = false,
  onSelect,
  onClearSelection,
  onFilterChange,
}: InboxListProps) {
  const [activeTab, setActiveTab] = React.useState<InboxTab>("UNREAD");

  const querySection: NotificationSection = activeTab === "MENTIONS" ? "ALL" : activeTab;

  const { data, isLoading, isError, error, refetch } = useNotifications(
    { section: querySection, category: activeTab === "MENTIONS" ? "PROJECTS" : undefined, limit: 100 },
    { staleTime: 30_000 },
  );

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  function handleSelect(notification: Notification) {
    if (!notification.isRead) {
      markRead(notification.id);
    }
    onSelect(notification);
  }

  function handleTabChange(value: string) {
    if (isInboxTab(value)) {
      setActiveTab(value);
      onFilterChange?.();
    }
  }

  function handleMarkAll() {
    markAllRead();
  }

  function handleRetry() {
    refetch();
  }

  const rawNotifications = data ?? [];
  const notifications = activeTab === "MENTIONS"
    ? rawNotifications.filter(isMentionNotification)
    : rawNotifications;
  const hasUnread = notifications.some((n) => !n.isRead);
  const firstNotification = notifications[0] ?? null;
  const selectedStillVisible =
    selectedId == null || notifications.some((n) => n.id === selectedId);

  const onSelectRef = React.useRef(onSelect);
  const onClearSelectionRef = React.useRef(onClearSelection);
  const firstNotificationRef = React.useRef(firstNotification);
  onSelectRef.current = onSelect;
  onClearSelectionRef.current = onClearSelection;
  firstNotificationRef.current = firstNotification;

  React.useEffect(() => {
    if (isLoading || isError) return;
    if (selectedId != null && !selectedStillVisible) {
      onClearSelectionRef.current?.();
      return;
    }
    if (selectedId != null || selectionDismissed) return;
    const first = firstNotificationRef.current;
    if (first) onSelectRef.current(first);
  }, [
    isLoading,
    isError,
    selectedId,
    selectedStillVisible,
    selectionDismissed,
    firstNotification?.id,
  ]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex shrink-0 flex-col gap-2 border border-r-0 border-border px-4 py-2.5">
        <TabsList>
          {SECTION_FILTERS.map(({ label, value }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {hasUnread ? (
          <AnimatedIconButton
            icon={CheckCheckIcon}
            iconSize={14}
            variant="ghost"
            size="sm"
            className="h-7 self-end px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            disabled={isMarkingAll}
            onClick={handleMarkAll}
          >
            Mark all read
          </AnimatedIconButton>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-l border-border scrollbar-hide">
        {isLoading && <InboxListSkeleton />}

        {!isLoading && isError && (
          <div className="p-4">
            <ErrorState
              description={getErrorMessage(error)}
              onRetry={handleRetry}
              compact
            />
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex min-h-full flex-1 flex-col items-center justify-center p-4">
            <EmptyState
              illustrationPreset="mail"
              title={
                activeTab === "UNREAD"
                  ? "All caught up"
                  : activeTab === "MENTIONS"
                  ? "No mentions"
                  : "No notifications"
              }
              description={
                activeTab === "UNREAD"
                  ? "You have no unread notifications."
                  : activeTab === "MENTIONS"
                  ? "You have not been mentioned in any comments yet."
                  : "Notifications will appear here when you receive them."
              }
              compact
              className="w-full rounded-lg border-dashed"
            />
          </div>
        )}

        {!isLoading && !isError && notifications.length > 0 && (
          <div>
            {notifications.map((notification) => (
              <InboxNotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedId === notification.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </Tabs>
  );
}
