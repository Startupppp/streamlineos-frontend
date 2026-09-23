"use client";

import { memo, useCallback, useMemo, type Key } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InboxItemCard, type InboxItemCardProps } from "./inbox-item-card";
import type { UnifiedInboxItem } from "@/types/inbox";
import type { InboxGroup } from "./inbox-grouping";
import {
  buildFlatRows,
  rowHeightFor,
  type FlatRow,
} from "./inbox-grouped-rows";

const ROW_GAP_PX = 8;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;
const LOAD_MORE_KEY = "loadmore";

interface GroupedRowData {
  rows: FlatRow[];
  isFetchingNextPage: boolean;
  isOnline: boolean;
  selectedKeys: Set<string> | undefined;
  onToggleSelect: ((key: string) => void) | undefined;
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

function getRowKey(index: number, data: GroupedRowData): Key {
  const row = data.rows[index];
  if (!row) return index;
  if (row.type === "header") return `header:${row.groupKey}`;
  if (row.type === "loadmore") return LOAD_MORE_KEY;
  return row.item.dedupKey;
}

function GroupedInboxVirtualRow({
  ariaAttributes,
  index,
  style,
  rows,
  isFetchingNextPage,
  isOnline,
  selectedKeys,
  onToggleSelect,
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
}: RowComponentProps<GroupedRowData>) {
  const row = rows[index];
  if (!row) return <div style={style} {...ariaAttributes} />;

  if (row.type === "loadmore") {
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

  if (row.type === "header") {
    return (
      <div
        style={{ ...style, paddingBottom: ROW_GAP_PX, boxSizing: "border-box" }}
        {...ariaAttributes}
        className="flex items-center gap-2 px-1"
        role="presentation"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {row.label}
        </span>
        <span className="text-xs text-muted-foreground/70">({row.count})</span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    );
  }

  const { item } = row;
  const notificationId = item.kind === "notification" ? item.id : undefined;
  const isSelected = selectedKeys?.has(item.dedupKey) ?? false;
  const showCheckbox = selectedKeys !== undefined;

  return (
    <div
      style={{ ...style, paddingBottom: ROW_GAP_PX, boxSizing: "border-box" }}
      {...ariaAttributes}
      className={showCheckbox ? "flex items-start gap-2" : undefined}
    >
      {showCheckbox && onToggleSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.dedupKey)}
          aria-label={`Select ${item.subject}`}
          className="mt-3 shrink-0"
        />
      )}
      <div className={showCheckbox ? "flex-1 min-w-0" : undefined}>
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
    </div>
  );
}

export interface InboxGroupedVirtualListProps {
  groups: InboxGroup[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isOnline: boolean;
  selectedKeys?: Set<string>;
  onToggleSelect?: (key: string) => void;
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

export const InboxGroupedVirtualList = memo(function InboxGroupedVirtualList({
  groups,
  hasNextPage,
  isFetchingNextPage,
  isOnline,
  selectedKeys,
  onToggleSelect,
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
}: InboxGroupedVirtualListProps) {
  const rows = useMemo(
    () => buildFlatRows(groups, hasNextPage),
    [groups, hasNextPage],
  );

  const heightKey = useMemo(
    () =>
      rows
        .map((r) =>
          r.type === "item"
            ? r.item.dedupKey
            : r.type === "header"
              ? `hdr:${r.groupKey}`
              : "loadmore",
        )
        .join("|"),
    [rows],
  );

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: rowHeightFor(rows[0]),
    key: heightKey,
  });

  const rowProps = useMemo(
    (): GroupedRowData => ({
      rows,
      isFetchingNextPage,
      isOnline,
      selectedKeys,
      onToggleSelect,
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
      rows, isFetchingNextPage, isOnline, selectedKeys, onToggleSelect,
      onNotificationClick, onBroadcastClick, onMailClick, onApprovalClick,
      onArchive, onDelete, onApprove, onReject,
      approvingId, rejectingId, archivingId, deletingId, onLoadMore,
    ],
  );

  const stableRowKey = useCallback(
    (index: number, data: GroupedRowData) => getRowKey(index, data),
    [],
  );

  return (
    <List<GroupedRowData>
      aria-label="Inbox items grouped"
      rowComponent={GroupedInboxVirtualRow}
      rowCount={rows.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      rowKey={stableRowKey}
      defaultHeight={DEFAULT_LIST_HEIGHT}
      overscanCount={OVERSCAN_COUNT}
      style={{ height: "100%" }}
    />
  );
});
