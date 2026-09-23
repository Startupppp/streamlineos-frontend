"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { NotificationDetailDrawerLazy } from "@/features/notifications/notification-detail-drawer-lazy";
import dynamic from "next/dynamic";
import { useUnifiedInbox } from "@/hooks/api/inbox";
import { useInboxActions } from "./use-inbox-actions";
import { useInboxFilterState } from "./use-inbox-filter-state";
import { groupInboxItems } from "./inbox-grouping";
import type { InboxGroupedVirtualListProps } from "./inbox-grouped-virtual-list";
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
import { toDrawerNotification } from "./inbox-schema";
import {
  dedupeInboxItems,
  deniedPermissionFor,
  degradedSources,
  isDegraded,
  unsupportedSourcesFor,
  INBOX_SOURCE_LABELS,
} from "./inbox-sources";
import { InboxDegradedBanner } from "./inbox-degraded-banner";
import { InboxToolbar } from "./inbox-toolbar";
import { BulkActionsBar } from "./inbox-bulk-actions";
import type { InboxVirtualListProps } from "./inbox-virtual-list";

const InboxVirtualList = dynamic<InboxVirtualListProps>(() =>
  import("./inbox-virtual-list").then((m) => m.InboxVirtualList),
);

const InboxGroupedVirtualList = dynamic<InboxGroupedVirtualListProps>(() =>
  import("./inbox-grouped-virtual-list").then((m) => m.InboxGroupedVirtualList),
);

export function InboxShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    filterState,
    queryParams,
    selectedKeys,
    handleViewChange,
    handleSearchChange,
    handleUnreadOnlyChange,
    handleCategoryChange,
    handlePriorityChange,
    handleKindOverrideChange,
    handleGroupChange,
    handleToggleSelect,
    handleClearSelection,
    applyFilterState,
  } = useInboxFilterState(searchParams, router);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useUnifiedInbox(queryParams);

  const actions = useInboxActions();

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const items = useMemo(() => dedupeInboxItems(pages), [pages]);
  const deferredItems = useDeferredValue(items);
  const groups = useMemo(
    () => groupInboxItems(deferredItems, filterState.group),
    [deferredItems, filterState.group],
  );
  const deniedPermission = deniedPermissionFor(filterState.view, pages[0]?.sources ?? []);
  const degraded = useMemo(
    () => (isDegraded(pages) ? degradedSources(pages) : []),
    [pages],
  );
  const unsupported = useMemo(
    () => unsupportedSourcesFor(pages[0]?.sources ?? []),
    [pages],
  );

  const handleNotificationClick = useCallback(
    (item: NotificationInboxItem) => {
      if (!item.isRead) actions.markReadOnOpen(item.id);
      if (item.deepLink) {
        router.push(normalizeBuildDeepLink(item.deepLink));
        return;
      }
      setSelectedNotification(toDrawerNotification(item));
      setDrawerOpen(true);
    },
    [actions, router],
  );

  const handleBroadcastClick = useCallback(
    (item: BroadcastInboxItem) => {
      if (!item.isRead) actions.dismissBroadcastOnOpen(item.id);
      if (item.deepLink) {
        router.push(normalizeBuildDeepLink(item.deepLink));
        return;
      }
      setSelectedNotification(toDrawerNotification(item));
      setDrawerOpen(true);
    },
    [actions, router],
  );

  const handleMailClick = useCallback(
    (item: MailInboxItem) => {
      const idParams =
        item.threadId !== null
          ? { threadId: item.threadId, accountId: String(item.accountId) }
          : { messageId: item.id, accountId: String(item.accountId) };
      router.push(`/mail?${toSearchParams(idParams).toString()}`);
    },
    [router],
  );

  const handleApprovalClick = useCallback(
    (item: BuildApprovalInboxItem) => {
      if (item.projectId !== null) {
        const params = toSearchParams({ projectId: String(item.projectId) });
        router.push(`/build/approvals?${params.toString()}`);
      } else {
        router.push("/build/approvals");
      }
    },
    [router],
  );

  const handleOpenLink = useCallback(
    (link: string) => router.push(normalizeBuildDeepLink(link)),
    [router],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Notifications, mail and approvals waiting for your attention"
      filters={
        <InboxToolbar
          state={filterState}
          onViewChange={handleViewChange}
          onSearchChange={handleSearchChange}
          onUnreadOnlyChange={handleUnreadOnlyChange}
          onCategoryChange={handleCategoryChange}
          onPriorityChange={handlePriorityChange}
          onKindOverrideChange={handleKindOverrideChange}
          onGroupChange={handleGroupChange}
          onApplySavedView={applyFilterState}
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
        ) : (
          <>
            <InboxDegradedBanner sources={degraded} onRetry={handleRetry} />
            {unsupported.length > 0 && (
              <div className="shrink-0 rounded-lg border border-border/70 bg-muted/30 px-4 py-2 flex flex-col gap-1">
                {unsupported.map(({ source, why }) => (
                  <p key={source.kind} className="text-xs text-muted-foreground">
                    <span className="font-medium">
                      {INBOX_SOURCE_LABELS[source.kind]}
                    </span>
                    {" is excluded from this view: "}
                    {why}
                  </p>
                ))}
              </div>
            )}
            <BulkActionsBar
              selectedKeys={selectedKeys}
              items={deferredItems}
              actions={actions}
              onClearSelection={handleClearSelection}
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
                {filterState.group !== "none" ? (
                  <InboxGroupedVirtualList
                    groups={groups}
                    hasNextPage={hasNextPage ?? false}
                    isFetchingNextPage={isFetchingNextPage}
                    isOnline={actions.isOnline}
                    selectedKeys={selectedKeys}
                    onToggleSelect={handleToggleSelect}
                    onNotificationClick={handleNotificationClick}
                    onBroadcastClick={handleBroadcastClick}
                    onMailClick={handleMailClick}
                    onApprovalClick={handleApprovalClick}
                    onArchive={actions.handleArchive}
                    onDelete={actions.handleDelete}
                    onApprove={actions.handleApprove}
                    onReject={actions.handleReject}
                    approvingId={actions.approvingId}
                    rejectingId={actions.rejectingId}
                    archivingId={actions.archivingId}
                    deletingId={actions.deletingId}
                    onLoadMore={handleLoadMore}
                  />
                ) : (
                  <InboxVirtualList
                    items={deferredItems}
                    hasNextPage={hasNextPage ?? false}
                    isFetchingNextPage={isFetchingNextPage}
                    isOnline={actions.isOnline}
                    selectedKeys={selectedKeys}
                    onToggleSelect={handleToggleSelect}
                    onNotificationClick={handleNotificationClick}
                    onBroadcastClick={handleBroadcastClick}
                    onMailClick={handleMailClick}
                    onApprovalClick={handleApprovalClick}
                    onArchive={actions.handleArchive}
                    onDelete={actions.handleDelete}
                    onApprove={actions.handleApprove}
                    onReject={actions.handleReject}
                    approvingId={actions.approvingId}
                    rejectingId={actions.rejectingId}
                    archivingId={actions.archivingId}
                    deletingId={actions.deletingId}
                    onLoadMore={handleLoadMore}
                  />
                )}
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
          onMarkRead={actions.handleMarkRead}
          onArchive={actions.handleArchive}
          onUnarchive={actions.handleUnarchive}
          onPin={actions.handlePin}
          onSnooze={actions.handleSnooze}
          onDelete={actions.handleDelete}
        />
      )}
    </PageWrapper>
  );
}
