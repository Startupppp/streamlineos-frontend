"use client";

import { memo, useCallback, useMemo, type Key } from "react";
import { List, type RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { InboxItemCard, type InboxItemCardProps } from "./inbox-item-card";
import type { UnifiedInboxItem } from "@/types/inbox";

const INBOX_ROW_HEIGHT = 96;
const LOAD_MORE_ROW_HEIGHT = 52;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

interface InboxVirtualRowData {
  items: UnifiedInboxItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onNotificationClick: InboxItemCardProps["onNotificationClick"];
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

function getRowHeight(index: number, data: InboxVirtualRowData): number {
  if (data.hasNextPage && index === data.items.length)
    return LOAD_MORE_ROW_HEIGHT;
  return INBOX_ROW_HEIGHT;
}

function getRowKey(index: number, data: InboxVirtualRowData): Key {
  if (data.hasNextPage && index === data.items.length) return "loadmore";
  const item = data.items[index];
  if (!item) return index;
  return `${item.kind}:${item.id}`;
}

function InboxVirtualRow({
  ariaAttributes,
  index,
  style,
  items,
  hasNextPage,
  isFetchingNextPage,
  onNotificationClick,
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
      <div style={style} className="flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      </div>
    );
  }

  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={{ ...style, paddingBottom: 8 }} {...ariaAttributes}>
      <InboxItemCard
        item={item}
        onNotificationClick={onNotificationClick}
        onMailClick={onMailClick}
        onApprovalClick={onApprovalClick}
        onArchive={onArchive}
        onDelete={onDelete}
        onApprove={onApprove}
        onReject={onReject}
        isApproving={approvingId === item.id}
        isRejecting={rejectingId === item.id}
        isArchiving={archivingId === item.id}
        isDeleting={deletingId === item.id}
      />
    </div>
  );
}

export interface InboxVirtualListProps {
  items: UnifiedInboxItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onNotificationClick: InboxItemCardProps["onNotificationClick"];
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
  onNotificationClick,
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

  const rowProps = useMemo(
    (): InboxVirtualRowData => ({
      items,
      hasNextPage,
      isFetchingNextPage,
      onNotificationClick,
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
      onNotificationClick,
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

  const stableRowKey = useCallback(getRowKey, []);
  const stableRowHeight = useCallback(getRowHeight, []);

  return (
    <List<InboxVirtualRowData>
      rowComponent={InboxVirtualRow}
      rowCount={rowCount}
      rowHeight={stableRowHeight}
      rowProps={rowProps}
      rowKey={stableRowKey}
      defaultHeight={DEFAULT_LIST_HEIGHT}
      overscanCount={OVERSCAN_COUNT}
      style={{ height: "100%" }}
    />
  );
});
