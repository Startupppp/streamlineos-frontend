"use client";

import { memo, useCallback, useMemo, type Key } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { InboxItemCard, type InboxItemCardProps } from "./inbox-item-card";
import type { UnifiedInboxItem } from "@/types/inbox";

const INBOX_ROW_HEIGHT = 96;
const ROW_GAP_PX = 8;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;
const LOAD_MORE_KEY = "loadmore";

interface InboxVirtualRowData {
  items: UnifiedInboxItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isOnline: boolean;
  onNotificationClick: InboxItemCardProps["onNotificationClick"];
  onBroadcastClick: InboxItemCardProps["onBroadcastClick"];
  onMailClick: InboxItemCardProps["onMailClick"];
  onApprovalClick: InboxItemCardProps["onApprovalClick"];
  onArchive: InboxItemCardProps["onArchive"];
  onDelete: InboxItemCardProps["onDelete"];
  onApprove: InboxItemCardProps["onApprove"];
  onReject: InboxItemCardProps["onReject"];
  approvingId: number | undefined;
  rejectingId: number | undefined;
  archivingId: number | undefined;
  deletingId: number | undefined;
  onLoadMore: () => void;
}

function getRowKey(index: number, data: InboxVirtualRowData): Key {
  if (data.hasNextPage && index === data.items.length) return LOAD_MORE_KEY;
  const item = data.items[index];
  if (!item) return index;
  return item.dedupKey;
}

function pendingNotificationId(item: UnifiedInboxItem): number | undefined {
  return item.kind === "notification" ? item.id : undefined;
}

function InboxVirtualRow({
  ariaAttributes,
  index,
  style,
  items,
  hasNextPage,
  isFetchingNextPage,
  isOnline,
  onNotificationClick,
  onBroadcastClick,
  onMailClick,
  onApprovalClick,
  onArchive,
  onDelete,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
  archivingId,
  deletingId,
  onLoadMore,
}: RowComponentProps<InboxVirtualRowData>) {
  if (hasNextPage && index === items.length) {
    return (
      <div
        style={{ ...style, paddingBottom: ROW_GAP_PX, boxSizing: "border-box" }}
        {...ariaAttributes}
        className="flex items-center justify-center py-2"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={isFetchingNextPage || !isOnline}
        >
          {!isOnline
            ? "Offline — reconnect to load more"
            : isFetchingNextPage
              ? "Loading…"
              : "Load more"}
        </Button>
      </div>
    );
  }

  const item = items[index];
  if (!item) return <div style={style} {...ariaAttributes} />;

  const notificationId = pendingNotificationId(item);

  return (
    <div
      style={{ ...style, paddingBottom: ROW_GAP_PX, boxSizing: "border-box" }}
      {...ariaAttributes}
    >
      <InboxItemCard
        item={item}
        onNotificationClick={onNotificationClick}
        onBroadcastClick={onBroadcastClick}
        onMailClick={onMailClick}
        onApprovalClick={onApprovalClick}
        onArchive={onArchive}
        onDelete={onDelete}
        onApprove={onApprove}
        onReject={onReject}
        isApproving={notificationId !== undefined && approvingId === notificationId}
        isRejecting={notificationId !== undefined && rejectingId === notificationId}
        isArchiving={notificationId !== undefined && archivingId === notificationId}
        isDeleting={notificationId !== undefined && deletingId === notificationId}
      />
    </div>
  );
}

export interface InboxVirtualListProps {
  items: UnifiedInboxItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isOnline: boolean;
  onNotificationClick: InboxItemCardProps["onNotificationClick"];
  onBroadcastClick: InboxItemCardProps["onBroadcastClick"];
  onMailClick: InboxItemCardProps["onMailClick"];
  onApprovalClick: InboxItemCardProps["onApprovalClick"];
  onArchive: InboxItemCardProps["onArchive"];
  onDelete: InboxItemCardProps["onDelete"];
  onApprove: InboxItemCardProps["onApprove"];
  onReject: InboxItemCardProps["onReject"];
  approvingId: number | undefined;
  rejectingId: number | undefined;
  archivingId: number | undefined;
  deletingId: number | undefined;
  onLoadMore: () => void;
}

export const InboxVirtualList = memo(function InboxVirtualList({
  items,
  hasNextPage,
  isFetchingNextPage,
  isOnline,
  onNotificationClick,
  onBroadcastClick,
  onMailClick,
  onApprovalClick,
  onArchive,
  onDelete,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
  archivingId,
  deletingId,
  onLoadMore,
}: InboxVirtualListProps) {
  const rowCount = items.length + (hasNextPage ? 1 : 0);

  const heightKey = useMemo(
    () =>
      `${items.map((item) => item.dedupKey).join("|")}#${hasNextPage ? 1 : 0}`,
    [items, hasNextPage],
  );

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: INBOX_ROW_HEIGHT,
    key: heightKey,
  });

  const rowProps = useMemo(
    (): InboxVirtualRowData => ({
      items,
      hasNextPage,
      isFetchingNextPage,
      isOnline,
      onNotificationClick,
      onBroadcastClick,
      onMailClick,
      onApprovalClick,
      onArchive,
      onDelete,
      onApprove,
      onReject,
      approvingId,
      rejectingId,
      archivingId,
      deletingId,
      onLoadMore,
    }),
    [
      items,
      hasNextPage,
      isFetchingNextPage,
      isOnline,
      onNotificationClick,
      onBroadcastClick,
      onMailClick,
      onApprovalClick,
      onArchive,
      onDelete,
      onApprove,
      onReject,
      approvingId,
      rejectingId,
      archivingId,
      deletingId,
      onLoadMore,
    ],
  );

  const stableRowKey = useCallback(
    (index: number, data: InboxVirtualRowData) => getRowKey(index, data),
    [],
  );

  return (
    <List<InboxVirtualRowData>
      aria-label="Inbox items"
      rowComponent={InboxVirtualRow}
      rowCount={rowCount}
      rowHeight={rowHeight}
      rowProps={rowProps}
      rowKey={stableRowKey}
      defaultHeight={DEFAULT_LIST_HEIGHT}
      overscanCount={OVERSCAN_COUNT}
      style={{ height: "100%" }}
    />
  );
});
