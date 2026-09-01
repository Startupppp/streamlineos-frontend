"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import dynamic from "next/dynamic";

const NotificationDetailDrawer = dynamic(
  () =>
    import("@/features/notifications/notification-detail-drawer").then((m) => ({
      default: m.NotificationDetailDrawer,
    })),
  { ssr: false },
);
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
import { useUnifiedInbox } from "@/hooks/api/inbox";
import { InboxItemCard } from "./inbox-item-card";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import type { Notification } from "@/types/notifications";
import type { InboxKind, MailInboxItem, BuildApprovalInboxItem } from "@/types/inbox";
import { cn } from "@/lib/utils";

type InboxView = "ALL" | "NOTIFICATIONS" | "MAIL" | "APPROVALS";

const VIEW_KINDS: Record<InboxView, InboxKind[] | undefined> = {
  ALL: undefined,
  NOTIFICATIONS: ["notification", "broadcast"],
  MAIL: ["mail"],
  APPROVALS: ["build_approval"],
};

const VIEWS: Array<{ key: InboxView; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NOTIFICATIONS", label: "Notifications" },
  { key: "MAIL", label: "Mail" },
  { key: "APPROVALS", label: "Approvals" },
];

export function InboxShell() {
  const router = useRouter();
  const [view, setView] = useState<InboxView>("ALL");
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
  } = useUnifiedInbox({ kinds: VIEW_KINDS[view], limit: 25 });

  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const unarchive = useUnarchiveNotification();
  const del = useDeleteNotification();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();
  const snooze = useSnoozeNotification();
  const approve = useApproveNotification();
  const reject = useRejectNotification();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleNotificationClick = useCallback(
    (n: { id: number; isRead: boolean; link: string | null }) => {
      if (!n.isRead) markRead.mutate(n.id);
      if (n.link) {
        router.push(n.link);
        return;
      }
      const fullNotif = items
        .filter((i) => i.kind === "notification" || i.kind === "broadcast")
        .find((i) => i.id === n.id);
      if (fullNotif && (fullNotif.kind === "notification" || fullNotif.kind === "broadcast")) {
        const mapped: Notification = {
          id: fullNotif.id,
          orgId: "",
          userId: null,
          type: fullNotif.notifType as Notification["type"],
          priority: fullNotif.priority as Notification["priority"],
          category: fullNotif.category as Notification["category"],
          sourceModule: fullNotif.sourceModule,
          eventKey: fullNotif.kind === "notification" ? fullNotif.eventKey : null,
          title: fullNotif.subject,
          message: fullNotif.body,
          link: fullNotif.deepLink,
          isRead: fullNotif.isRead,
          pinned: fullNotif.kind === "notification" ? fullNotif.pinned : false,
          channel: "IN_APP",
          archivedAt: null,
          snoozedUntil: null,
          createdAt: fullNotif.timestamp,
        };
        setSelectedNotification(mapped);
        setDrawerOpen(true);
      }
    },
    [items, markRead, router],
  );

  const handleMailClick = useCallback(
    (item: MailInboxItem) => {
      router.push(`/mail?messageId=${item.id}&accountId=${item.accountId}`);
    },
    [router],
  );

  const handleApprovalClick = useCallback(
    (item: BuildApprovalInboxItem) => {
      router.push(`/build/approvals?projectId=${item.projectId}`);
    },
    [router],
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
      subtitle="Notifications, mail and approvals waiting for your attention"
      filters={
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                view === v.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {v.label}
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
        ) : items.length === 0 ? (
          <EmptyState
            className="flex-1 min-h-0"
            illustration={<Inbox className="h-8 w-8 text-muted-foreground/40" />}
            title="All caught up"
            description="Notifications, mail and approvals will appear here when they arrive."
          />
        ) : (
          <>
            {items.map((item) => (
              <InboxItemCard
                key={`${item.kind}:${item.id}`}
                item={item}
                onNotificationClick={handleNotificationClick}
                onMailClick={handleMailClick}
                onApprovalClick={handleApprovalClick}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={approve.isPending && approve.variables === item.id}
                isRejecting={reject.isPending && reject.variables === item.id}
                isArchiving={archive.isPending && archive.variables === item.id}
                isDeleting={del.isPending && del.variables === item.id}
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
