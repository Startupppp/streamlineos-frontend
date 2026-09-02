"use client";

import { memo, useCallback, useMemo, type Key } from "react";
import { List, type RowComponentProps } from "react-window";
import { LoadingButton } from "@/components/ui/loading-button";
import { NotificationCard } from "./notification-card";
import type { Notification } from "@/types/notifications";

const NOTIFICATION_ROW_HEIGHT = 88;
const LOAD_MORE_ROW_HEIGHT = 52;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

interface NotificationVirtualRowData {
  items: Notification[];
  selectedIds: Set<number>;
  isApprovalSection: boolean;
  approvingId: number | undefined;
  rejectingId: number | undefined;
  archivingId: number | undefined;
  pinningId: number | undefined;
  deletingId: number | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSelect: (id: number) => void;
  onClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
  onArchive: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onLoadMore: () => void;
}

function getRowHeight(index: number, data: NotificationVirtualRowData): number {
  if (index === data.items.length) return LOAD_MORE_ROW_HEIGHT;
  return NOTIFICATION_ROW_HEIGHT;
}

function getRowKey(index: number, data: NotificationVirtualRowData): Key {
  if (index === data.items.length) return "loadmore";
  return data.items[index]?.id ?? index;
}

function NotificationVirtualRow({
  ariaAttributes,
  index,
  style,
  items,
  selectedIds,
  isApprovalSection,
  approvingId,
  rejectingId,
  archivingId,
  pinningId,
  deletingId,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onClick,
  onArchive,
  onPin,
  onDelete,
  onApprove,
  onReject,
  onLoadMore,
}: RowComponentProps<NotificationVirtualRowData>) {
  if (hasNextPage && index === items.length) {
    return (
      <div style={style} className="flex items-center justify-center">
        <LoadingButton
          variant="outline"
          size="sm"
          isPending={isFetchingNextPage}
          onClick={onLoadMore}
        >
          Load older notifications
        </LoadingButton>
      </div>
    );
  }

  const n = items[index];
  if (!n) return <div style={style} />;

  return (
    <div style={style} {...ariaAttributes} className="border-b border-border">
      <NotificationCard
        id={n.id}
        title={n.title}
        message={n.message}
        type={n.type}
        priority={n.priority ?? "NORMAL"}
        category={n.category ?? "SYSTEM"}
        sourceModule={n.sourceModule ?? null}
        isRead={n.isRead}
        pinned={n.pinned ?? false}
        archivedAt={n.archivedAt ?? null}
        createdAt={n.createdAt}
        link={n.link}
        selected={selectedIds.has(n.id)}
        isApproval={isApprovalSection}
        isApproving={approvingId === n.id}
        isRejecting={rejectingId === n.id}
        isArchiving={archivingId === n.id}
        isPinning={pinningId === n.id}
        isDeleting={deletingId === n.id}
        onSelect={onSelect}
        onClick={onClick}
        onArchive={onArchive}
        onPin={onPin}
        onDelete={onDelete}
        onApprove={isApprovalSection ? onApprove : undefined}
        onReject={isApprovalSection ? onReject : undefined}
      />
    </div>
  );
}

export interface NotificationVirtualListProps {
  items: Notification[];
  selectedIds: Set<number>;
  isApprovalSection: boolean;
  approvingId: number | undefined;
  rejectingId: number | undefined;
  archivingId: number | undefined;
  pinningId: number | undefined;
  deletingId: number | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSelect: (id: number) => void;
  onClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
  onArchive: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onLoadMore: () => void;
}

export const NotificationVirtualList = memo(function NotificationVirtualList({
  items,
  selectedIds,
  isApprovalSection,
  approvingId,
  rejectingId,
  archivingId,
  pinningId,
  deletingId,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onClick,
  onArchive,
  onPin,
  onDelete,
  onApprove,
  onReject,
  onLoadMore,
}: NotificationVirtualListProps) {
  const rowCount = items.length + (hasNextPage ? 1 : 0);

  const rowProps = useMemo(
    (): NotificationVirtualRowData => ({
      items,
      selectedIds,
      isApprovalSection,
      approvingId,
      rejectingId,
      archivingId,
      pinningId,
      deletingId,
      hasNextPage,
      isFetchingNextPage,
      onSelect,
      onClick,
      onArchive,
      onPin,
      onDelete,
      onApprove,
      onReject,
      onLoadMore,
    }),
    [items, selectedIds, isApprovalSection, approvingId, rejectingId, archivingId, pinningId, deletingId, hasNextPage, isFetchingNextPage, onSelect, onClick, onArchive, onPin, onDelete, onApprove, onReject, onLoadMore],
  );

  const stableRowKey = useCallback(getRowKey, []);
  const stableRowHeight = useCallback(getRowHeight, []);

  return (
    <List<NotificationVirtualRowData>
      rowComponent={NotificationVirtualRow}
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
