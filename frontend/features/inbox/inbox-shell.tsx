"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NotificationCard } from "@/features/notifications/notification-card";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { NotificationDetailDrawer } from "@/features/notifications/notification-detail-drawer";
import {
  useMarkNotificationRead,
  useArchiveNotification,
  useUnarchiveNotification,
  useDeleteNotification,
  useApproveNotification,
  useRejectNotification,
  usePinNotification,
  useUnpinNotification,
  useSnoozeNotification,
} from "@/hooks/api/notifications";
import { useInfiniteInbox, type InboxSection } from "@/hooks/api/inbox";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import type { Notification } from "@/types/notifications";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{ key: InboxSection; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "MENTIONS", label: "Mentions" },
  { key: "ASSIGNED_TO_ME", label: "Assigned to me" },
  { key: "APPROVALS", label: "Approvals" },
];

export function InboxShell() {
  const router = useRouter();
  const [section, setSection] = useState<InboxSection>("ALL");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteInbox({ section, limit: 25 });

  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const unarchive = useUnarchiveNotification();
  const del = useDeleteNotification();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();
  const snooze = useSnoozeNotification();
  const approve = useApproveNotification();
  const reject = useRejectNotification();

  const notifications = data?.pages.flat() ?? [];

  const handleClick = useCallback(
    (n: { id: number; isRead: boolean; link: string | null }) => {
      if (!n.isRead) markRead.mutate(n.id);
      if (n.link) {
        router.push(n.link);
        return;
      }
      const full = notifications.find((x) => x.id === n.id);
      if (full) {
        setSelectedNotification(full);
        setDrawerOpen(true);
      }
    },
    [notifications, markRead, router],
  );

  const handleOpenLink = useCallback((link: string) => router.push(link), [router]);
  const handleMarkRead = useCallback((id: number) => markRead.mutate(id), [markRead]);
  const handleArchive = useCallback((id: number) => archive.mutate(id), [archive]);
  const handleUnarchive = useCallback((id: number) => unarchive.mutate(id), [unarchive]);
  const handlePin = useCallback(
    (id: number, pinned: boolean) => (pinned ? pin.mutate(id) : unpin.mutate(id)),
    [pin, unpin],
  );
  const handleSnooze = useCallback(
    (id: number, snoozedUntil: string) => snooze.mutate({ id, snoozedUntil }),
    [snooze],
  );
  const handleDelete = useCallback((id: number) => del.mutate(id), [del]);
  const handleApprove = useCallback((id: number) => approve.mutate(id), [approve]);
  const handleReject = useCallback((id: number) => reject.mutate(id), [reject]);

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments and approvals waiting for your attention"
      filters={
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                section === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        {isLoading ? (
          <NotificationListSkeleton count={10} />
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load inbox"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            className="flex-1 min-h-0"
            icon={Inbox}
            title="All caught up"
            description="Mentions, assignments and approvals will appear here when they arrive."
          />
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                id={n.id}
                title={n.title}
                message={n.message}
                type={n.type}
                priority={n.priority}
                category={n.category}
                sourceModule={n.sourceModule}
                isRead={n.isRead}
                pinned={n.pinned}
                archivedAt={n.archivedAt}
                createdAt={n.createdAt}
                link={n.link}
                isApproval={n.category === "WORKFLOW"}
                isApproving={approve.isPending && approve.variables === n.id}
                isRejecting={reject.isPending && reject.variables === n.id}
                isArchiving={archive.isPending && archive.variables === n.id}
                isDeleting={del.isPending && del.variables === n.id}
                onClick={handleClick}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <NotificationDetailDrawer
        open={drawerOpen}
        notification={selectedNotification}
        onOpenChange={setDrawerOpen}
        onOpenLink={handleOpenLink}
        onMarkRead={handleMarkRead}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onPin={handlePin}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />
    </PageWrapper>
  );
}
