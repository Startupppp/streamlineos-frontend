"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import dynamic from "next/dynamic";

const NotificationDetailDrawer = dynamic(
  () =>
    import("@/features/notifications/notification-detail-drawer").then((m) => ({
      default: m.NotificationDetailDrawer,
    })),
  { ssr: false },
);
import { useUnifiedInbox } from "@/hooks/api/inbox";
import { InboxVirtualList } from "./inbox-virtual-list";
import { useInboxActions } from "./use-inbox-actions";
import { getErrorMessage } from "@/lib/get-error-message";
import { Inbox } from "lucide-react";
import type { Notification } from "@/types/notifications";
import type {
  InboxKind,
  InboxSourceStatus,
  MailInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";
import { cn } from "@/lib/utils";
import {
  parseNotifType,
  parseNotifPriority,
  parseNotifCategory,
} from "./inbox-schema";

type InboxView = "ALL" | "NOTIFICATIONS" | "MAIL" | "APPROVALS";

const VIEW_KINDS: Record<InboxView, InboxKind[] | undefined> = {
  ALL: undefined,
  NOTIFICATIONS: ["notification", "broadcast"],
  MAIL: ["mail"],
  APPROVALS: ["build_approval"],
};

const PERMISSION_REASON_PREFIX = "no permission: ";

function deniedPermissionFor(
  view: InboxView,
  sources: InboxSourceStatus[],
): string | null {
  const kinds = VIEW_KINDS[view];
  if (!kinds) return null;
  const relevant = sources.filter((source) => kinds.includes(source.kind));
  if (relevant.length === 0) return null;
  const refused = relevant.filter(
    (source) =>
      !source.included && source.reason?.startsWith(PERMISSION_REASON_PREFIX),
  );
  if (refused.length !== relevant.length) return null;
  const first = refused[0];
  return first?.reason?.slice(PERMISSION_REASON_PREFIX.length) ?? null;
}

const VIEWS: Array<{ key: InboxView; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NOTIFICATIONS", label: "Notifications" },
  { key: "MAIL", label: "Mail" },
  { key: "APPROVALS", label: "Approvals" },
];

interface InboxViewTabProps {
  view: InboxView;
  label: string;
  isActive: boolean;
  onSelect: (view: InboxView) => void;
}

function InboxViewTab({ view, label, isActive, onSelect }: InboxViewTabProps) {
  const handleClick = useCallback(() => onSelect(view), [onSelect, view]);
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={handleClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-label font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function InboxShell() {
  const router = useRouter();
  const [view, setView] = useState<InboxView>("ALL");
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
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

  const {
    isOnline,
    markReadOnOpen,
    handleMarkRead,
    handleArchive,
    handleUnarchive,
    handlePin,
    handleSnooze,
    handleDelete,
    handleApprove,
    handleReject,
    approvingId,
    rejectingId,
    archivingId,
    deletingId,
  } = useInboxActions();

  useEffect(() => {
    void import("@/features/notifications/notification-detail-drawer");
  }, []);

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const deniedPermission = deniedPermissionFor(
    view,
    data?.pages[0]?.sources ?? [],
  );

  const handleNotificationClick = useCallback(
    (n: { id: number; isRead: boolean; link: string | null }) => {
      if (!n.isRead) markReadOnOpen(n.id);
      if (n.link) {
        router.push(n.link);
        return;
      }
      const fullNotif = items
        .filter((i) => i.kind === "notification" || i.kind === "broadcast")
        .find((i) => i.id === n.id);
      if (
        fullNotif &&
        (fullNotif.kind === "notification" || fullNotif.kind === "broadcast")
      ) {
        const mapped: Notification = {
          id: fullNotif.id,
          orgId: "",
          userId: null,
          type: parseNotifType(fullNotif.notifType),
          priority: parseNotifPriority(fullNotif.priority),
          category: parseNotifCategory(fullNotif.category),
          sourceModule: fullNotif.sourceModule,
          eventKey:
            fullNotif.kind === "notification" ? fullNotif.eventKey : null,
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
    [items, markReadOnOpen, router],
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

  const handleOpenLink = useCallback(
    (link: string) => router.push(link),
    [router],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleLoadMore = useCallback(
    () => void fetchNextPage(),
    [fetchNextPage],
  );

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Notifications, mail and approvals waiting for your attention"
      filters={
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {VIEWS.map((v) => (
            <InboxViewTab
              key={v.key}
              view={v.key}
              label={v.label}
              isActive={view === v.key}
              onSelect={setView}
            />
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
            onRetry={handleRetry}
          />
        ) : deniedPermission ? (
          <NoPermissionState
            className="flex-1"
            permission={deniedPermission}
            description="This inbox view is not available to your role. Other views still work."
          />
        ) : items.length === 0 ? (
          <EmptyState
            className="flex-1 min-h-0"
            illustration={
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
            }
            title="All caught up"
            description="Notifications, mail and approvals will appear here when they arrive."
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <InboxVirtualList
              items={items}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              isOnline={isOnline}
              onNotificationClick={handleNotificationClick}
              onMailClick={handleMailClick}
              onApprovalClick={handleApprovalClick}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              approvingId={approvingId}
              rejectingId={rejectingId}
              archivingId={archivingId}
              deletingId={deletingId}
              onLoadMore={handleLoadMore}
            />
          </div>
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
