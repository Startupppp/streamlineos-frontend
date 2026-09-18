"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { NotificationDetailDrawerLazy } from "@/features/notifications/notification-detail-drawer-lazy";
import dynamic from "next/dynamic";
import { useUnifiedInbox } from "@/hooks/api/inbox";
import { useInboxActions } from "./use-inbox-actions";
import { getErrorMessage } from "@/lib/get-error-message";
import { toSearchParams } from "@/lib/route-search-params";
import { normalizeBuildDeepLink } from "@/lib/build/normalize-build-deep-link";
import { Inbox } from "lucide-react";
import type { Notification } from "@/types/notifications";
import type {
  NotificationInboxItem,
  BroadcastInboxItem,
  MailInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { toDrawerNotification } from "./inbox-schema";
import {
  VIEWS,
  VIEW_KINDS,
  dedupeInboxItems,
  deniedPermissionFor,
  degradedSources,
  isDegraded,
  type InboxView,
} from "./inbox-sources";
import { InboxDegradedBanner } from "./inbox-degraded-banner";
import type { InboxVirtualListProps } from "./inbox-virtual-list";

const InboxVirtualList = dynamic<InboxVirtualListProps>(
  () => import("./inbox-virtual-list").then((m) => m.InboxVirtualList),
);


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
    dismissBroadcastOnOpen,
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

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const items = useMemo(() => dedupeInboxItems(pages), [pages]);
  const deferredItems = useDeferredValue(items);
  const deniedPermission = deniedPermissionFor(view, pages[0]?.sources ?? []);
  const degraded = useMemo(
    () => (isDegraded(pages) ? degradedSources(pages) : []),
    [pages],
  );

  const handleNotificationClick = useCallback(
    (item: NotificationInboxItem) => {
      if (!item.isRead) markReadOnOpen(item.id);
      if (item.deepLink) {
        router.push(normalizeBuildDeepLink(item.deepLink));
        return;
      }
      setSelectedNotification(toDrawerNotification(item));
      setDrawerOpen(true);
    },
    [markReadOnOpen, router],
  );

  const handleBroadcastClick = useCallback(
    (item: BroadcastInboxItem) => {
      if (!item.isRead) dismissBroadcastOnOpen(item.id);
      if (item.deepLink) {
        router.push(normalizeBuildDeepLink(item.deepLink));
        return;
      }
      setSelectedNotification(toDrawerNotification(item));
      setDrawerOpen(true);
    },
    [dismissBroadcastOnOpen, router],
  );

  const handleMailClick = useCallback(
    (item: MailInboxItem) => {
      const params = toSearchParams({
        messageId: item.id,
        accountId: String(item.accountId),
      });
      router.push(`/mail?${params.toString()}`);
    },
    [router],
  );

  const handleApprovalClick = useCallback(
    (item: BuildApprovalInboxItem) => {
      const params = toSearchParams({ projectId: String(item.projectId) });
      router.push(`/build/approvals?${params.toString()}`);
    },
    [router],
  );

  const handleOpenLink = useCallback(
    (link: string) => router.push(normalizeBuildDeepLink(link)),
    [router],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleLoadMore = useCallback(
    () => void fetchNextPage(),
    [fetchNextPage],
  );
  const handleViewChange = useCallback((next: InboxView) => setView(next), []);

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Notifications, mail and approvals waiting for your attention"
      filters={
        <PageTabsToolbar
          tabs={
            <ViewToggle<InboxView>
              value={view}
              options={VIEWS}
              onChange={handleViewChange}
              showLabel
            />
          }
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        {isLoading ? (
          <div className="flex-1 min-h-0">
            <NotificationListSkeleton count={10} />
          </div>
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn’t load inbox"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : deniedPermission ? (
          <NoPermissionState
            className="flex-1"
            permission={deniedPermission}
            description="This inbox view is not available to your role. Other views still work."
          />
        ) : (
          <>
            <InboxDegradedBanner
              sources={degraded}
              onRetry={handleRetry}
            />
            {items.length === 0 ? (
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
                  items={deferredItems}
                  hasNextPage={hasNextPage ?? false}
                  isFetchingNextPage={isFetchingNextPage}
                  isOnline={isOnline}
                  onNotificationClick={handleNotificationClick}
                  onBroadcastClick={handleBroadcastClick}
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
          </>
        )}
      </div>

      {drawerOpen && (
        <NotificationDetailDrawerLazy
          open
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
      )}
    </PageWrapper>
  );
}
