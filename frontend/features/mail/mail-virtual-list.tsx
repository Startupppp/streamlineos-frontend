"use client";

import { memo, useCallback, useMemo, type Key } from "react";
import { List, type RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { MailMessageRow, type MailListAction } from "./mail-message-row";
import type { MailFolder, MailMessageSummary } from "@/types/mail";
import type { MailTriageGroup } from "./mail-group-messages";

const MESSAGE_ROW_HEIGHT = 72;
const HEADER_ROW_HEIGHT = 36;
const LOAD_MORE_ROW_HEIGHT = 52;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

type FlatItem =
  | { kind: "header"; label: string; count: number }
  | { kind: "message"; message: MailMessageSummary }
  | { kind: "loadmore" };

function buildFlatItems(
  groups: MailTriageGroup[],
  hasNextPage: boolean,
): FlatItem[] {
  const items: FlatItem[] = [];
  for (const group of groups) {
    if (group.label)
      items.push({ kind: "header", label: group.label, count: group.messages.length });
    for (const msg of group.messages) items.push({ kind: "message", message: msg });
  }
  if (hasNextPage) items.push({ kind: "loadmore" });
  return items;
}

interface MailVirtualRowData {
  items: FlatItem[];
  selectedMessageId: string | null;
  activeFolder: MailFolder;
  canAi: boolean;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function getRowHeight(index: number, data: MailVirtualRowData): number {
  const item = data.items[index];
  if (!item || item.kind === "message") return MESSAGE_ROW_HEIGHT;
  if (item.kind === "header") return HEADER_ROW_HEIGHT;
  return LOAD_MORE_ROW_HEIGHT;
}

function getRowKey(index: number, data: MailVirtualRowData): Key {
  const item = data.items[index];
  if (!item) return index;
  if (item.kind === "header") return `h-${item.label}`;
  if (item.kind === "loadmore") return "loadmore";
  return `${item.message.accountId}-${item.message.id}`;
}

function MailVirtualRow({
  ariaAttributes,
  index,
  style,
  items,
  selectedMessageId,
  activeFolder,
  canAi,
  onSelect,
  onAction,
  onAiBrief,
  isFetchingNextPage,
  onLoadMore,
}: RowComponentProps<MailVirtualRowData>) {
  const item = items[index];
  if (!item) return <div style={style} />;

  if (item.kind === "header") {
    return (
      <div
        style={style}
        role="presentation"
        className="flex items-center justify-between gap-2 px-3 bg-background/90 backdrop-blur-sm border-b border-border/30"
      >
        <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          {item.label}
        </span>
        <span className="text-micro tabular-nums text-muted-foreground">
          {item.count}
        </span>
      </div>
    );
  }

  if (item.kind === "loadmore") {
    return (
      <div style={style} className="flex justify-center items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="text-xs"
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      </div>
    );
  }

  return (
    <div style={style} {...ariaAttributes}>
      <MailMessageRow
        message={item.message}
        isSelected={selectedMessageId === item.message.id}
        folder={activeFolder}
        showPriority={activeFolder === "inbox"}
        canAi={canAi}
        onSelect={onSelect}
        onAction={onAction}
        onAiBrief={onAiBrief}
      />
    </div>
  );
}

export interface MailVirtualListProps {
  groups: MailTriageGroup[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  selectedMessageId: string | null;
  activeFolder: MailFolder;
  canAi: boolean;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
  onLoadMore: () => void;
}

export const MailVirtualList = memo(function MailVirtualList({
  groups,
  hasNextPage,
  isFetchingNextPage,
  selectedMessageId,
  activeFolder,
  canAi,
  onSelect,
  onAction,
  onAiBrief,
  onLoadMore,
}: MailVirtualListProps) {
  const items = useMemo(
    () => buildFlatItems(groups, hasNextPage),
    [groups, hasNextPage],
  );

  const rowProps = useMemo(
    (): MailVirtualRowData => ({
      items,
      selectedMessageId,
      activeFolder,
      canAi,
      onSelect,
      onAction,
      onAiBrief,
      isFetchingNextPage,
      onLoadMore,
    }),
    [items, selectedMessageId, activeFolder, canAi, onSelect, onAction, onAiBrief, isFetchingNextPage, onLoadMore],
  );

  const stableRowKey = useCallback(
    (index: number, data: MailVirtualRowData) => getRowKey(index, data),
    [],
  );
  const stableRowHeight = useCallback(
    (index: number, data: MailVirtualRowData) => getRowHeight(index, data),
    [],
  );

  return (
    <List<MailVirtualRowData>
      rowComponent={MailVirtualRow}
      rowCount={items.length}
      rowHeight={stableRowHeight}
      rowProps={rowProps}
      rowKey={stableRowKey}
      defaultHeight={DEFAULT_LIST_HEIGHT}
      overscanCount={OVERSCAN_COUNT}
      style={{ height: "100%" }}
    />
  );
});
